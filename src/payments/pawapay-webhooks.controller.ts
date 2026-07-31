import {
  Body,
  Controller,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { EtablissementPaymentsService } from '../etablissements/etablissement-payments.service';
import { ETABLISSEMENT_REF_PREFIX } from '../etablissements/etablissement-payments.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PAYMENTS_CONSTANTS } from './payments.constants';
import { PaymentsService } from './payments.service';

/**
 * Callbacks PawaPay (dashboard) — préfixe `/api` pour correspondre aux URLs ngrok.
 * Une seule URL de webhook, routée par préfixe de `clientReferenceId` vers le
 * service concerné (`BIBLIO-` = abonnement individuel, `ETAB-` = pack établissement)
 * pour ne courir aucun risque de régression sur le flux de paiement individuel.
 */
@ApiTags(SWAGGER_TAGS.PAYMENTS)
@Controller('api/webhooks/pawapay')
export class PawaPayWebhooksController {
  private readonly logger = new Logger(PawaPayWebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly providerFactory: PaymentProviderFactory,
    @Inject(forwardRef(() => EtablissementPaymentsService))
    private readonly etablissementPaymentsService: EtablissementPaymentsService,
  ) {}

  /** Ping pour vérifier que ngrok atteint bien le backend. */
  @Get('deposits')
  @HttpCode(HttpStatus.OK)
  depositsPing(): { ok: boolean; route: string; provider: string } {
    return {
      ok: true,
      route: 'POST /api/webhooks/pawapay/deposits',
      provider: this.configProviderLabel(),
    };
  }

  @Post('deposits')
  @HttpCode(HttpStatus.OK)
  depositCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    const s = (k: string) =>
      String((body[k] as string | number | null | undefined) ?? '?');
    this.logger.log(
      `Callback dépôt REÇU status=${s('status')} depositId=${s('depositId')} clientReferenceId=${s('clientReferenceId')}`,
    );

    res.status(HttpStatus.OK).send();
    this.dispatchDeposit(body);
  }

  @Post('payouts')
  @HttpCode(HttpStatus.OK)
  payoutCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    res.status(HttpStatus.OK).send();
    const s = (k: string) =>
      String((body[k] as string | number | null | undefined) ?? '?');
    this.logger.debug(
      `Callback payout (ignoré métier) status=${s('status')} payoutId=${s('payoutId')}`,
    );
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  refundCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    res.status(HttpStatus.OK).send();
    const s = (k: string) =>
      String((body[k] as string | number | null | undefined) ?? '?');
    this.logger.debug(
      `Callback refund (ignoré métier) status=${s('status')} refundId=${s('refundId')}`,
    );
  }

  private dispatchDeposit(body: Record<string, unknown>): void {
    if (!this.providerFactory.isPawaPayMode()) {
      this.logger.warn(
        'Callback dépôt ignoré : PAYMENT_PROVIDER n’est pas "pawapay"',
      );
      return;
    }

    const provider = this.providerFactory.getPawaPayProvider();
    const ref = provider.extractNotificationRef(body);
    if (!ref) {
      this.logger.warn(
        `Callback dépôt : impossible d’extraire la ref (body=${JSON.stringify(body).slice(0, 400)})`,
      );
      return;
    }

    const outcome = provider.parseNotificationOutcome(body);
    this.logger.log(
      `Callback dépôt → traitement ref=${ref} outcome=${outcome ?? 'via API'}`,
    );

    if (ref.startsWith(ETABLISSEMENT_REF_PREFIX)) {
      this.etablissementPaymentsService.processPaymentNotification(ref, body);
      return;
    }

    if (ref.startsWith(PAYMENTS_CONSTANTS.REF_PREFIX)) {
      this.paymentsService.processPaymentNotification(ref, body);
      return;
    }

    this.logger.warn(`Callback dépôt : préfixe de ref inconnu ref=${ref}`);
  }

  private configProviderLabel(): string {
    return this.providerFactory.isPawaPayMode() ? 'pawapay' : 'autre';
  }
}
