import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { toProviderAmount, toProviderCurrency } from '../currency.util';
import type { PaymentProviderOutcome } from '../payments.constants';
import type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';
import {
  pawapayFetchJson,
  toPawaPayCustomerMessage,
} from './pawapay/pawapay-api.util';
import { resolvePawaPayApiBase } from './pawapay/pawapay.config';
import {
  extractDepositFromCheckResponse,
  mapPawaPayDepositStatus,
} from './pawapay/pawapay-deposit-status.util';
import {
  decodePawaPayOperateur,
  encodePawaPayOperateur,
} from './pawapay/pawapay-operateur.util';
import { normalizePawaPayPhone } from './pawapay/pawapay-phone.util';
import {
  normalizePawaPayProviderCode,
  resolvePawaPayOperator,
} from './pawapay/pawapay-operator-resolve.util';
import type { PawaPayDepositInitResponse } from './pawapay/pawapay.types';

export interface PawaPayInitMeta {
  deposit_id: string;
  provider: string;
  initiation_status: string;
}

@Injectable()
export class PawaPayPayProvider implements PaymentProvider {
  private readonly logger = new Logger(PawaPayPayProvider.name);

  constructor(private readonly config: ConfigService) {}

  private getApiBase(): string {
    return resolvePawaPayApiBase(this.config);
  }

  private getToken(): string {
    const token = this.config.get<string>('PAWAPAY_API_TOKEN');
    if (!token?.trim()) {
      throw new BadGatewayException(
        'PawaPay non configuré (PAWAPAY_API_TOKEN manquant).',
      );
    }
    return token.trim();
  }

  private getDefaultProvider(): string {
    return this.config.get<string>(
      'PAWAPAY_DEFAULT_PROVIDER',
      'MTN_MOMO_COG',
    );
  }

  private getDefaultCurrency(): string {
    return (
      this.config.get<string>('PAWAPAY_DEFAULT_CURRENCY') ??
      toProviderCurrency('XOF')
    );
  }

  async initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const country = input.country?.trim().toUpperCase() || 'CG';
    const rawPhone = input.phonenumber ?? input.customer_phone;
    if (!rawPhone?.trim()) {
      throw new BadGatewayException(
        'Numéro de téléphone requis pour PawaPay (profil ou body init).',
      );
    }

    const phoneNumber = normalizePawaPayPhone(rawPhone, country);
    const provider =
      normalizePawaPayProviderCode(input.operator) ??
      resolvePawaPayOperator(phoneNumber, country) ??
      this.getDefaultProvider();
    const depositId = randomUUID();
    const currency =
      toProviderCurrency(input.devise_stockee) || this.getDefaultCurrency();
    const amount = String(toProviderAmount(input.montant));

    this.logger.log(
      `initDeposit ref=${input.ref_transaction} depositId=${depositId} provider=${provider} phone=${phoneNumber} amount=${amount} ${currency}`,
    );

    const body = {
      depositId,
      amount,
      currency,
      clientReferenceId: input.ref_transaction,
      customerMessage: toPawaPayCustomerMessage(input.description),
      payer: {
        type: 'MMO',
        accountDetails: {
          phoneNumber,
          provider,
        },
      },
    };

    const response = await pawapayFetchJson<PawaPayDepositInitResponse>(
      `${this.getApiBase()}/v2/deposits`,
      {
        method: 'POST',
        token: this.getToken(),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      this.logger,
      `init ref=${input.ref_transaction}`,
    );

    if (
      response.status !== 'ACCEPTED' &&
      response.status !== 'DUPLICATE_IGNORED'
    ) {
      const msg =
        response.failureReason?.failureMessage ??
        `Dépôt rejeté (${response.status})`;
      this.logger.warn(
        `initDeposit ref=${input.ref_transaction} status=${response.status} code=${response.failureReason?.failureCode ?? '?'}`,
      );
      throw new BadGatewayException(`PawaPay : ${msg}`);
    }

    this.logger.log(
      `initDeposit ref=${input.ref_transaction} → ${response.status} (callback attendu sur /api/webhooks/pawapay/deposits)`,
    );

    const returnBase = input.return_url.split('?')[0];
    const payment_url = `${returnBase}?transaction_id=${encodeURIComponent(input.ref_transaction)}&provider=pawapay`;

    return {
      payment_url,
      provider_meta: {
        operateur: encodePawaPayOperateur(provider, depositId),
        numero_telephone: phoneNumber,
      },
    };
  }

  async verifyPayment(
    ref_transaction: string,
    context?: { stored_operateur?: string | null },
  ): Promise<PaymentVerifyResult> {
    const decoded = decodePawaPayOperateur(context?.stored_operateur);
    if (!decoded) {
      this.logger.warn(
        `verifyPayment : depositId introuvable ref=${ref_transaction}`,
      );
      return { status: 'PENDING' };
    }

    try {
      const raw = await pawapayFetchJson<Record<string, unknown>>(
        `${this.getApiBase()}/v2/deposits/${decoded.depositId}`,
        { method: 'GET', token: this.getToken() },
        this.logger,
        `check ref=${ref_transaction}`,
      );

      const deposit = extractDepositFromCheckResponse(raw);
      if (!deposit) {
        this.logger.warn(
          `checkDeposit ref=${ref_transaction} depositId=${decoded.depositId} → NOT_FOUND`,
        );
        return { status: 'REFUSED' };
      }

      const depositStatus = deposit.status ?? 'UNKNOWN';
      const outcome = mapPawaPayDepositStatus(depositStatus);
      this.logger.log(
        `checkDeposit ref=${ref_transaction} depositId=${decoded.depositId} pawaPayStatus=${depositStatus} → ${outcome}`,
      );

      const phone =
        deposit.payer?.accountDetails?.phoneNumber ?? undefined;
      const op =
        deposit.payer?.accountDetails?.provider ?? decoded.provider;

      return {
        status: outcome,
        operateur: op,
        numero_telephone: phone,
      };
    } catch (error) {
      this.logger.error(`checkDeposit ref=${ref_transaction}`, error);
      return { status: 'PENDING' };
    }
  }

  extractNotificationRef(params: Record<string, unknown>): string | null {
    const clientRef = params.clientReferenceId;
    if (typeof clientRef === 'string' && clientRef.trim()) {
      return clientRef.trim();
    }

    const depositId = params.depositId;
    if (typeof depositId === 'string' && depositId.trim()) {
      return `__depositId:${depositId.trim()}`;
    }

    return null;
  }

  parseNotificationOutcome(
    params: Record<string, unknown>,
  ): PaymentProviderOutcome | null {
    const status = params.status;
    if (typeof status !== 'string') {
      return null;
    }
    return mapPawaPayDepositStatus(status);
  }

  getDepositIdFromOperateur(stored: string | null | undefined): string | null {
    return decodePawaPayOperateur(stored)?.depositId ?? null;
  }
}
