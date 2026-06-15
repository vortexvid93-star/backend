import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentsService } from './payments.service';

/**
 * Callbacks PawaPay (dashboard) — préfixe `/api` pour correspondre aux URLs ngrok.
 */
@ApiTags(SWAGGER_TAGS.PAYMENTS)
@Controller('api/webhooks/pawapay')
export class PawaPayWebhooksController {
  private readonly logger = new Logger(PawaPayWebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly providerFactory: PaymentProviderFactory,
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
    const status = String(body.status ?? '?');
    const depositId = String(body.depositId ?? '?');
    const clientRef = String(body.clientReferenceId ?? '?');
    this.logger.log(
      `Callback dépôt REÇU status=${status} depositId=${depositId} clientReferenceId=${clientRef}`,
    );

    res.status(HttpStatus.OK).send();
    this.dispatchDeposit(body);
  }

  @Post('payouts')
  @HttpCode(HttpStatus.OK)
  payoutCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    res.status(HttpStatus.OK).send();
    this.logger.debug(
      `Callback payout (ignoré métier) status=${String(body.status ?? '?')} payoutId=${String(body.payoutId ?? '?')}`,
    );
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  refundCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    res.status(HttpStatus.OK).send();
    this.logger.debug(
      `Callback refund (ignoré métier) status=${String(body.status ?? '?')} refundId=${String(body.refundId ?? '?')}`,
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

    this.paymentsService.processPaymentNotification(ref, body);
  }

  private configProviderLabel(): string {
    return this.providerFactory.isPawaPayMode() ? 'pawapay' : 'autre';
  }
}
