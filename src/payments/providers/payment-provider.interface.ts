import type { PaymentProviderOutcome } from '../payments.constants';

export interface PaymentInitInput {
  ref_transaction: string;
  montant: number;
  devise_stockee: string;
  description: string;
  customer_email: string;
  customer_phone: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  /** Code opérateur Mobile Money (ex. `MTN_MOMO_COG`, `AIRTEL_COG`). */
  operator?: string;
  phonenumber?: string;
  country?: string;
  return_url: string;
  notify_url: string;
}

export interface PaymentInitResult {
  payment_url: string;
  /** Métadonnées à persister dans `paiement` sans changer le schéma. */
  provider_meta?: {
    operateur?: string;
    numero_telephone?: string;
  };
}

export interface PaymentVerifyContext {
  stored_operateur?: string | null;
}

export interface PaymentVerifyResult {
  status: PaymentProviderOutcome;
  operateur?: string;
  numero_telephone?: string;
}

export interface PaymentProvider {
  initPayment(input: PaymentInitInput): Promise<PaymentInitResult>;
  verifyPayment(
    ref_transaction: string,
    context?: PaymentVerifyContext,
  ): Promise<PaymentVerifyResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
