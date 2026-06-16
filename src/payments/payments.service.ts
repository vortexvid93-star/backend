import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { StatutPaiement } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENTS_CONSTANTS } from './payments.constants';
import type { InitPaymentDto } from './dto/init-payment.dto';
import type { MockSimulateDto } from './dto/mock-simulate.dto';
import { PlansService } from './plans.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import type { PaymentProviderOutcome } from './payments.constants';
import { applySuccessfulPayment } from './subscription-activation.util';
import {
  activeSubscriptionWhere,
  computeJoursRestants,
} from './subscription-query.util';
import { SubscriptionsService } from './subscriptions.service';
import { PushService } from '../push/push.service';
import { resolvePawaPayPublicBase } from './providers/pawapay/pawapay.config';
import { decodePawaPayOperateur } from './providers/pawapay/pawapay-operateur.util';

/** Délais de réconciliation auto si le callback PawaPay est lent ou perdu. */
const PAWAPAY_RECONCILE_MS = [3_000, 8_000, 20_000] as const;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly config: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly pushService: PushService,
  ) {}

  async initPayment(authId: string, dto: InitPaymentDto) {
    const planId = dto.plan_id;
    const plan = await this.plansService.findActivePlanById(planId);
    if (!plan) {
      throw new BadRequestException('Plan invalide ou inactif.');
    }

    await this.assertCanInitPayment(authId, planId);

    const montant = Number(plan.prix);
    if (montant < PAYMENTS_CONSTANTS.MIN_AMOUNT_XOF) {
      throw new BadRequestException(
        `Montant minimum : ${PAYMENTS_CONSTANTS.MIN_AMOUNT_XOF} XOF.`,
      );
    }

    const ref_transaction = `${PAYMENTS_CONSTANTS.REF_PREFIX}${randomUUID()}`;
    const publicBase = this.getPaymentPublicBaseUrl();
    const return_url = `${publicBase}/payments/return`;
    const notify_url = `${publicBase}/payments/webhook`;

    const auth = await this.prisma.auth.findUniqueOrThrow({
      where: { id: authId },
      include: { personne: true },
    });

    if (this.providerFactory.isPawaPayMode()) {
      const phone = dto.phonenumber?.trim() || auth.numero_telephone?.trim();
      if (!phone) {
        throw new BadRequestException(
          'Numéro de téléphone requis (body `phonenumber` ou profil `numero_telephone`).',
        );
      }
    }

    const paiement = await this.prisma.paiement.create({
      data: {
        auth_id: authId,
        plan_id: plan.id,
        montant: plan.prix,
        devise: plan.devise,
        ref_transaction,
        statut: StatutPaiement.EN_ATTENTE,
      },
    });

    const provider = this.providerFactory.getProvider();

    try {
      const initResult = await provider.initPayment({
        ref_transaction,
        montant,
        devise_stockee: plan.devise,
        description: `Abonnement BiblioTech — ${plan.plan}`,
        customer_email: auth.email,
        customer_phone: auth.numero_telephone,
        customer_first_name: auth.personne.prenom,
        customer_last_name: auth.personne.nom,
        operator: dto.operator,
        phonenumber: dto.phonenumber,
        country: dto.country,
        return_url,
        notify_url,
      });

      if (initResult.provider_meta) {
        await this.prisma.paiement.update({
          where: { id: paiement.id },
          data: {
            operateur: initResult.provider_meta.operateur ?? undefined,
            numero_telephone:
              initResult.provider_meta.numero_telephone ?? undefined,
          },
        });
      }

      if (this.providerFactory.isPawaPayMode()) {
        this.schedulePawaPayReconciliation(ref_transaction);
        const depositId = decodePawaPayOperateur(
          initResult.provider_meta?.operateur,
        )?.depositId;
        this.logger.log(
          `PawaPay init OK ref=${ref_transaction} depositId=${depositId ?? '?'} — callback + réconciliation auto programmés`,
        );
      }

      const base = {
        payment_url: initResult.payment_url,
        ref_transaction,
        paiement_id: paiement.id,
        channel_ussd: this.extractChannelUssd(initResult.payment_url),
      };

      if (this.providerFactory.isPawaPayMode()) {
        const depositId = decodePawaPayOperateur(
          initResult.provider_meta?.operateur,
        )?.depositId;
        return {
          ...base,
          statut: StatutPaiement.EN_ATTENTE,
          message:
            'Dépôt initié chez PawaPay. Confirmation automatique par callback (quelques secondes en sandbox). Utilisez GET /payments/status pour suivre.',
          pawapay: {
            deposit_id: depositId,
            initiation_accepted: true,
          },
        };
      }

      return base;
    } catch (error) {
      await this.prisma.paiement.update({
        where: { id: paiement.id },
        data: { statut: StatutPaiement.ECHEC },
      });

      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error('Erreur fournisseur paiement', error);
      throw new BadGatewayException('Erreur API de paiement.');
    }
  }

  async getCheckoutPreview(authId: string, planId: string) {
    return this.subscriptionsService.buildCheckoutPreview(authId, planId);
  }

  async getPaymentStatus(authId: string, refTransaction: string) {
    const ref = refTransaction.trim();
    const paiement = await this.prisma.paiement.findUnique({
      where: { ref_transaction: ref },
      include: {
        plan: true,
        abonnement: { include: { plan: true } },
      },
    });

    if (!paiement) {
      throw new NotFoundException('Transaction introuvable.');
    }

    if (paiement.auth_id !== authId) {
      throw new ForbiddenException('Transaction d’un autre utilisateur.');
    }

    if (
      paiement.statut === StatutPaiement.EN_ATTENTE &&
      this.providerFactory.isPawaPayMode()
    ) {
      await this.handleWebhook(ref);
      const refreshed = await this.prisma.paiement.findUniqueOrThrow({
        where: { ref_transaction: ref },
        include: {
          plan: true,
          abonnement: { include: { plan: true } },
        },
      });
      Object.assign(paiement, refreshed);
    }

    const payload = this.buildReturnPayload(paiement.statut);

    const current = await this.prisma.abonnement.findFirst({
      where: activeSubscriptionWhere(authId),
      include: { plan: true },
      orderBy: { date_debut: 'desc' },
    });

    return {
      ref_transaction: ref,
      paiement_id: paiement.id,
      plan: {
        id: paiement.plan.id,
        plan: paiement.plan.plan,
        prix: Number(paiement.montant),
        devise: paiement.devise,
        duree_jours: paiement.plan.duree_jours,
      },
      abonnement_lie: paiement.abonnement
        ? {
            date_debut: paiement.abonnement.date_debut.toISOString(),
            date_fin: paiement.abonnement.date_fin.toISOString(),
            plan: paiement.abonnement.plan.plan,
          }
        : null,
      abonnement_actuel: current
        ? {
            id: current.id,
            plan: current.plan.plan,
            date_fin: current.date_fin.toISOString(),
            jours_restants: computeJoursRestants(current.date_fin),
          }
        : null,
      ...payload,
    };
  }

  async listPendingPayments(authId: string) {
    const rows = await this.prisma.paiement.findMany({
      where: {
        auth_id: authId,
        statut: StatutPaiement.EN_ATTENTE,
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      data: rows.map((row) => ({
        paiement_id: row.id,
        ref_transaction: row.ref_transaction,
        montant: Number(row.montant),
        devise: row.devise,
        plan: row.plan.plan,
        plan_id: row.plan_id,
        cree_le: row.createdAt.toISOString(),
      })),
    };
  }

  async getReturnStatus(transactionId?: string) {
    if (!transactionId?.trim()) {
      throw new NotFoundException('Transaction introuvable.');
    }

    const ref = transactionId.trim();
    const paiement = await this.prisma.paiement.findUnique({
      where: { ref_transaction: ref },
      include: {
        plan: true,
        abonnement: { include: { plan: true } },
      },
    });

    if (!paiement) {
      throw new NotFoundException('Transaction introuvable.');
    }

    const payload = this.buildReturnPayload(paiement.statut);

    return {
      ref_transaction: ref,
      plan: paiement.plan.plan,
      montant: Number(paiement.montant),
      devise: paiement.devise,
      abonnement: paiement.abonnement
        ? {
            plan: paiement.abonnement.plan.plan,
            date_debut: paiement.abonnement.date_debut.toISOString(),
            date_fin: paiement.abonnement.date_fin.toISOString(),
            statut: paiement.abonnement.statut,
          }
        : await this.resolveAbonnementAfterExtension(paiement),
      ...payload,
    };
  }

  private async resolveAbonnementAfterExtension(paiement: {
    auth_id: string;
    plan_id: string;
    statut: StatutPaiement;
  }) {
    if (paiement.statut !== StatutPaiement.SUCCES) {
      return null;
    }

    const current = await this.prisma.abonnement.findFirst({
      where: activeSubscriptionWhere(paiement.auth_id),
      include: { plan: true },
    });

    if (!current || current.plan_id !== paiement.plan_id) {
      return null;
    }

    return {
      plan: current.plan.plan,
      date_debut: current.date_debut.toISOString(),
      date_fin: current.date_fin.toISOString(),
      statut: current.statut,
      prolongation: true,
    };
  }

  async simulateMockPayment(dto: MockSimulateDto) {
    if (!this.providerFactory.isMockMode()) {
      throw new BadRequestException(
        'Simulation disponible uniquement avec PAYMENT_PROVIDER=mock.',
      );
    }

    const status = this.outcomeToProviderStatus(dto.outcome);
    const mock = this.providerFactory.getMockProvider();

    if (status !== 'PENDING') {
      mock.setSimulatedOutcome(dto.transaction_id, status, {
        operateur: dto.operateur ?? 'MOCK-MTN',
        numero_telephone: dto.numero_telephone ?? '+242060000000',
      });
    }

    await this.handleWebhook(dto.transaction_id);
    return this.getReturnStatus(dto.transaction_id);
  }

  processPaymentNotification(
    rawRef: string,
    params?: Record<string, unknown>,
  ): void {
    void this.handleWebhook(rawRef, params).catch((error) => {
      this.logger.error(
        `Webhook async ref=${rawRef}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }

  async handleWebhook(
    rawRef: string,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const ref = await this.resolveWebhookRef(rawRef.trim(), params);
    if (!ref) {
      this.logger.warn(
        `handleWebhook : ref introuvable rawRef=${rawRef.slice(0, 80)}`,
      );
      return;
    }

    const paiement = await this.prisma.paiement.findUnique({
      where: { ref_transaction: ref },
      include: { plan: true },
    });

    if (!paiement) {
      this.logger.warn(`handleWebhook : paiement absent ref=${ref}`);
      return;
    }

    if (paiement.statut !== StatutPaiement.EN_ATTENTE) {
      this.logger.log(
        `handleWebhook : ref=${ref} déjà traité statut=${paiement.statut}`,
      );
      return;
    }

    const provider = this.providerFactory.getProvider();
    const notifyOutcome = params
      ? this.parseProviderNotificationOutcome(params)
      : null;
    const pawaPayStatus =
      params && typeof params.status === 'string' ? params.status : null;

    let verification: Awaited<ReturnType<typeof provider.verifyPayment>>;

    if (notifyOutcome) {
      this.logger.log(
        `handleWebhook ref=${ref} source=callback pawaPayStatus=${pawaPayStatus ?? '?'} outcome=${notifyOutcome}`,
      );
      verification = {
        status: notifyOutcome,
        operateur: paiement.operateur?.split('#')[0] ?? undefined,
        numero_telephone: paiement.numero_telephone ?? undefined,
      };
    } else {
      this.logger.log(`handleWebhook ref=${ref} source=api_check`);
      try {
        verification = await provider.verifyPayment(ref, {
          stored_operateur: paiement.operateur,
        });
      } catch (error) {
        this.logger.error(`Vérification paiement ref=${ref}`, error);
        return;
      }
    }

    switch (verification.status) {
      case 'ACCEPTED':
        this.logger.log(
          `handleWebhook ref=${ref} → SUCCES + activation abonnement`,
        );
        await this.activateSubscription(paiement.id, {
          operateur: verification.operateur ?? null,
          numero_telephone: verification.numero_telephone ?? null,
        });
        break;
      case 'REFUSED':
      case 'CANCELLED':
        this.logger.warn(
          `handleWebhook ref=${ref} → ECHEC (${verification.status})`,
        );
        await this.prisma.paiement.update({
          where: { id: paiement.id },
          data: { statut: StatutPaiement.ECHEC },
        });
        break;
      case 'PENDING':
      default:
        this.logger.log(
          `handleWebhook ref=${ref} → toujours EN_ATTENTE (outcome=${verification.status})`,
        );
        break;
    }
  }

  /** Filet : interroge PawaPay si le callback n’est pas encore arrivé. */
  private schedulePawaPayReconciliation(ref_transaction: string): void {
    for (const delayMs of PAWAPAY_RECONCILE_MS) {
      setTimeout(() => {
        void this.handleWebhook(ref_transaction).catch((error) => {
          this.logger.error(
            `Réconciliation PawaPay ref=${ref_transaction} (+${delayMs}ms)`,
            error instanceof Error ? error.stack : error,
          );
        });
      }, delayMs);
    }
  }

  private async activateSubscription(
    paiementId: string,
    details: { operateur: string | null; numero_telephone: string | null },
  ) {
    let authId: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.findUnique({
        where: { id: paiementId },
        include: { plan: true },
      });

      if (!paiement) return;

      authId = paiement.auth_id;
      await applySuccessfulPayment(tx, { paiement, ...details });
    });

    if (!authId) return;

    const lastNotif = await this.prisma.notification.findFirst({
      where: { auth_id: authId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastNotif) {
      void this.pushService.sendToUser(authId, {
        title: lastNotif.titre,
        body: lastNotif.contenu ?? '',
        data: { type: lastNotif.type, notificationId: lastNotif.id },
      });
    }
  }

  private async assertCanInitPayment(authId: string, planId: string) {
    const since = new Date(
      Date.now() - PAYMENTS_CONSTANTS.PENDING_DUPLICATE_MINUTES * 60 * 1000,
    );

    const recentPending = await this.prisma.paiement.findFirst({
      where: {
        auth_id: authId,
        plan_id: planId,
        statut: StatutPaiement.EN_ATTENTE,
        createdAt: { gte: since },
      },
    });

    if (recentPending) {
      throw new BadRequestException(
        `Un paiement est déjà en cours pour ce plan (ref: ${recentPending.ref_transaction}). Attendez ou consultez GET /payments/pending.`,
      );
    }
  }

  private outcomeToProviderStatus(
    outcome: MockSimulateDto['outcome'],
  ): PaymentProviderOutcome {
    switch (outcome) {
      case 'success':
        return 'ACCEPTED';
      case 'failure':
        return 'REFUSED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  private async resolveWebhookRef(
    rawRef: string,
    params?: Record<string, unknown>,
  ): Promise<string | null> {
    if (
      rawRef &&
      !rawRef.startsWith('__paymentId:') &&
      !rawRef.startsWith('__depositId:')
    ) {
      return rawRef;
    }

    const paymentId =
      rawRef.replace('__paymentId:', '') ||
      (typeof params?.paymentId === 'string' ? params.paymentId : null) ||
      (typeof params?.payment_id === 'string' ? params.payment_id : null);

    const depositId = rawRef.startsWith('__depositId:')
      ? rawRef.replace('__depositId:', '')
      : typeof params?.depositId === 'string'
        ? params.depositId
        : null;

    if (depositId) {
      const byDeposit = await this.prisma.paiement.findMany({
        where: {
          statut: StatutPaiement.EN_ATTENTE,
          operateur: { contains: `#${depositId}` },
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      });
      return byDeposit[0]?.ref_transaction ?? null;
    }

    if (!paymentId) {
      const extracted = this.extractProviderNotificationRef(params ?? {});
      if (
        extracted &&
        !extracted.startsWith('__paymentId:') &&
        !extracted.startsWith('__depositId:')
      ) {
        return extracted;
      }
      return null;
    }

    const rows = await this.prisma.paiement.findMany({
      where: {
        statut: StatutPaiement.EN_ATTENTE,
        operateur: { contains: `#${paymentId}` },
      },
      take: 1,
      orderBy: { createdAt: 'desc' },
    });

    return rows[0]?.ref_transaction ?? null;
  }

  private getPaymentPublicBaseUrl(): string {
    if (this.providerFactory.isPawaPayMode()) {
      const base = resolvePawaPayPublicBase(this.config);
      if (!base) {
        throw new BadGatewayException(
          'PAWAPAY_PUBLIC_BASE_URL ou PAYMENT_PUBLIC_BASE_URL requis (URL ngrok / domaine public).',
        );
      }
      return base;
    }
    return this.config.getOrThrow<string>('PAYMENT_PUBLIC_BASE_URL');
  }

  private parseProviderNotificationOutcome(
    params: Record<string, unknown>,
  ): PaymentProviderOutcome | null {
    if (this.providerFactory.isPawaPayMode()) {
      return this.providerFactory
        .getPawaPayProvider()
        .parseNotificationOutcome(params);
    }
    return null;
  }

  private extractProviderNotificationRef(
    params: Record<string, unknown>,
  ): string | null {
    if (this.providerFactory.isPawaPayMode()) {
      return this.providerFactory
        .getPawaPayProvider()
        .extractNotificationRef(params);
    }
    return null;
  }

  private extractChannelUssd(paymentUrl: string): string | undefined {
    try {
      const ussd = new URL(paymentUrl).searchParams.get('channel_ussd');
      return ussd ?? undefined;
    } catch {
      return undefined;
    }
  }

  private buildReturnPayload(statut: StatutPaiement) {
    switch (statut) {
      case StatutPaiement.SUCCES:
        return {
          statut,
          message: 'Paiement confirmé. Votre abonnement est actif ou prolongé.',
        };
      case StatutPaiement.ECHEC:
        return {
          statut,
          message: 'Le paiement a échoué. Vous pouvez réessayer.',
        };
      default:
        return {
          statut: StatutPaiement.EN_ATTENTE,
          message:
            'Paiement en cours de traitement. Actualisez dans quelques instants.',
        };
    }
  }
}
