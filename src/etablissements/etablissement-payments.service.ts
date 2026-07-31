import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { StatutEtablissement, StatutPaiement } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import type { PaymentProviderOutcome } from '../payments/payments.constants';
import {
  isPawaPayCallbackOnly,
  resolvePawaPayPublicBase,
  resolvePawaPayReconcileDelayMs,
  resolvePawaPayReconcileDelaysMs,
} from '../payments/providers/pawapay/pawapay.config';
import type { PayEtablissementDto } from './dto/pay-etablissement.dto';

export const ETABLISSEMENT_REF_PREFIX = 'ETAB-';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCodeInvitation(): string {
  const bytes = randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `BLNK-${suffix}`;
}

@Injectable()
export class EtablissementPaymentsService {
  private readonly logger = new Logger(EtablissementPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly config: ConfigService,
  ) {}

  async listOffres() {
    const offres = await this.prisma.etablissementOffre.findMany({
      where: { statut: 'ACTIF' },
      orderBy: { prix: 'asc' },
    });

    return offres.map((offre) => ({
      id: offre.id,
      nom: offre.nom,
      nb_users_max: offre.nb_users_max,
      prix: Number(offre.prix),
      devise: offre.devise,
      duree_jours: offre.duree_jours,
    }));
  }

  async payer(dto: PayEtablissementDto) {
    const offre = await this.prisma.etablissementOffre.findUnique({
      where: { id: dto.offre_id },
    });
    if (!offre || offre.statut !== 'ACTIF') {
      throw new BadRequestException('Offre invalide ou inactive.');
    }

    const ref_transaction = `${ETABLISSEMENT_REF_PREFIX}${randomUUID()}`;
    const publicBase = this.getPublicBaseUrl();
    const return_url = `${publicBase}/pack-etablissement/success?ref=${ref_transaction}`;
    const notify_url = `${publicBase}/api/webhooks/pawapay/deposits`;

    if (this.providerFactory.isPawaPayMode() && !dto.phonenumber?.trim()) {
      throw new BadRequestException(
        'Numéro de téléphone requis (`phonenumber`).',
      );
    }

    const paiement = await this.prisma.paiementEtablissement.create({
      data: {
        offre_id: offre.id,
        nom_etablissement: dto.nom_etablissement.trim(),
        email_contact: dto.email_contact.trim(),
        telephone_contact: dto.telephone_contact?.trim() || null,
        montant: offre.prix,
        devise: offre.devise,
        ref_transaction,
        statut: StatutPaiement.EN_ATTENTE,
      },
    });

    const provider = this.providerFactory.getProvider();

    try {
      const initResult = await provider.initPayment({
        ref_transaction,
        montant: Number(offre.prix),
        devise_stockee: offre.devise,
        description: `Pack établissement B LINKS — ${offre.nom}`,
        customer_email: dto.email_contact,
        customer_phone: dto.telephone_contact ?? null,
        operator: dto.operator,
        phonenumber: dto.phonenumber,
        country: dto.country,
        return_url,
        notify_url,
      });

      if (initResult.provider_meta) {
        await this.prisma.paiementEtablissement.update({
          where: { id: paiement.id },
          data: {
            operateur: initResult.provider_meta.operateur ?? undefined,
            numero_telephone:
              initResult.provider_meta.numero_telephone ?? undefined,
          },
        });
      }

      // Filet de sécurité si le callback PawaPay n'arrive pas (ex. notify_url
      // non joignable en local) : sans ça, `statut` reste EN_ATTENTE pour
      // toujours et le front finit par expirer après 120s sans jamais voir
      // le succès, même si le paiement a bien été accepté côté PawaPay.
      if (
        this.providerFactory.isPawaPayMode() &&
        !isPawaPayCallbackOnly(this.config)
      ) {
        this.schedulePawaPayReconciliation(
          ref_transaction,
          resolvePawaPayReconcileDelaysMs(this.config),
        );
      }

      return {
        payment_url: initResult.payment_url,
        ref_transaction,
        paiement_id: paiement.id,
      };
    } catch (error) {
      await this.prisma.paiementEtablissement.update({
        where: { id: paiement.id },
        data: { statut: StatutPaiement.ECHEC },
      });
      this.logger.error('Erreur fournisseur paiement établissement', error);
      throw new BadGatewayException('Erreur API de paiement.');
    }
  }

  async getStatut(ref: string) {
    let paiement = await this.prisma.paiementEtablissement.findUnique({
      where: { ref_transaction: ref },
      include: { etablissement: true },
    });
    if (!paiement) {
      throw new NotFoundException('Transaction introuvable.');
    }

    if (
      paiement.statut === StatutPaiement.EN_ATTENTE &&
      this.providerFactory.isPawaPayMode() &&
      !isPawaPayCallbackOnly(this.config) &&
      this.isPawaPayReconcileDue(paiement.createdAt)
    ) {
      await this.handleWebhook(ref);
      paiement = await this.prisma.paiementEtablissement.findUniqueOrThrow({
        where: { ref_transaction: ref },
        include: { etablissement: true },
      });
    }

    return {
      ref_transaction: ref,
      statut: paiement.statut,
      etablissement: paiement.etablissement
        ? {
            code_invitation: paiement.etablissement.code_invitation,
            nom: paiement.etablissement.nom,
            date_debut: paiement.etablissement.date_debut.toISOString(),
            date_fin: paiement.etablissement.date_fin.toISOString(),
          }
        : null,
    };
  }

  /** Traite la notification PawaPay pour les refs `ETAB-` (voir dispatchDeposit). */
  processPaymentNotification(
    rawRef: string,
    params?: Record<string, unknown>,
  ): void {
    void this.handleWebhook(rawRef, params).catch((error) => {
      this.logger.error(
        `Webhook établissement async ref=${rawRef}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }

  private async handleWebhook(
    ref: string,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const paiement = await this.prisma.paiementEtablissement.findUnique({
      where: { ref_transaction: ref },
    });
    if (!paiement) {
      this.logger.warn(`handleWebhook établissement : paiement absent ref=${ref}`);
      return;
    }

    if (paiement.statut !== StatutPaiement.EN_ATTENTE) {
      this.logger.log(
        `handleWebhook établissement : ref=${ref} déjà traité statut=${paiement.statut}`,
      );
      return;
    }

    const provider = this.providerFactory.getProvider();
    let outcome: PaymentProviderOutcome | null = null;

    if (params && this.providerFactory.isPawaPayMode()) {
      outcome = this.providerFactory
        .getPawaPayProvider()
        .parseNotificationOutcome(params);
    }

    if (!outcome) {
      try {
        const verification = await provider.verifyPayment(ref, {
          stored_operateur: paiement.operateur,
        });
        outcome = verification.status;
      } catch (error) {
        this.logger.error(`Vérification paiement établissement ref=${ref}`, error);
        return;
      }
    }

    if (outcome === 'ACCEPTED') {
      await this.activateEtablissement(paiement.id);
    } else if (outcome === 'REFUSED' || outcome === 'CANCELLED') {
      await this.prisma.paiementEtablissement.update({
        where: { id: paiement.id },
        data: { statut: StatutPaiement.ECHEC },
      });
    }
  }

  private async activateEtablissement(paiementId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const paiement = await tx.paiementEtablissement.findUniqueOrThrow({
        where: { id: paiementId },
        include: { offre: true },
      });

      if (paiement.statut !== StatutPaiement.EN_ATTENTE) return;

      const now = new Date();
      const dateFin = new Date(now);
      dateFin.setDate(dateFin.getDate() + paiement.offre.duree_jours);

      let etablissement;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          etablissement = await tx.etablissement.create({
            data: {
              nom: paiement.nom_etablissement,
              email_contact: paiement.email_contact,
              telephone_contact: paiement.telephone_contact,
              code_invitation: generateCodeInvitation(),
              nb_users_max: paiement.offre.nb_users_max,
              prix: paiement.offre.prix,
              devise: paiement.offre.devise,
              duree_jours: paiement.offre.duree_jours,
              statut: StatutEtablissement.ACTIF,
              date_debut: now,
              date_fin: dateFin,
            },
          });
          break;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            continue;
          }
          throw error;
        }
      }

      if (!etablissement) {
        throw new Error(
          'Impossible de générer un code d’invitation unique après plusieurs tentatives.',
        );
      }

      await tx.paiementEtablissement.update({
        where: { id: paiementId },
        data: {
          statut: StatutPaiement.SUCCES,
          etablissement_id: etablissement.id,
        },
      });
    });
  }

  private schedulePawaPayReconciliation(
    ref_transaction: string,
    delayMsList: readonly number[],
  ): void {
    for (const delayMs of delayMsList) {
      setTimeout(() => {
        void this.handleWebhook(ref_transaction).catch((error) => {
          this.logger.error(
            `Réconciliation PawaPay établissement ref=${ref_transaction} (+${delayMs}ms)`,
            error instanceof Error ? error.stack : error,
          );
        });
      }, delayMs);
    }
  }

  private isPawaPayReconcileDue(createdAt: Date): boolean {
    const delayMs = resolvePawaPayReconcileDelayMs(this.config);
    return Date.now() - createdAt.getTime() >= delayMs;
  }

  private getPublicBaseUrl(): string {
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
}
