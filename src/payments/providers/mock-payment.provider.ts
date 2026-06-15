import { Injectable } from '@nestjs/common';
import type { PaymentProviderOutcome } from '../payments.constants';
import { toProviderAmount, toProviderCurrency } from '../currency.util';
import type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyResult,
} from './payment-provider.interface';

/** Sandbox local : simule un prestataire Mobile Money sans appel externe. */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly outcomes = new Map<string, PaymentProviderOutcome>();
  private readonly meta = new Map<
    string,
    { operateur?: string; numero_telephone?: string }
  >();

  setSimulatedOutcome(
    ref_transaction: string,
    status: PaymentProviderOutcome,
    meta?: { operateur?: string; numero_telephone?: string },
  ): void {
    this.outcomes.set(ref_transaction, status);
    if (meta) {
      this.meta.set(ref_transaction, meta);
    }
  }

  initPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
    const devise = toProviderCurrency(input.devise_stockee);
    const montant = toProviderAmount(input.montant);
    const payment_url =
      `${input.return_url.split('?')[0]}?transaction_id=${encodeURIComponent(input.ref_transaction)}` +
      `&_mock=1&_devise_api=${devise}&_montant_api=${montant}`;

    return Promise.resolve({ payment_url });
  }

  verifyPayment(ref_transaction: string): Promise<PaymentVerifyResult> {
    const status = this.outcomes.get(ref_transaction) ?? 'PENDING';
    const details = this.meta.get(ref_transaction);

    return Promise.resolve({
      status,
      operateur: details?.operateur,
      numero_telephone: details?.numero_telephone,
    });
  }
}
