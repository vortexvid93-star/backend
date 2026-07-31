export const PAYMENTS_CONSTANTS = {
  REF_PREFIX: 'BIBLIO-',
  MIN_AMOUNT_XAF: 100,
  /** Délai minimum entre deux init identiques (plan + utilisateur). */
  PENDING_DUPLICATE_MINUTES: 15,
  EXPIRE_BIENTOT_JOURS: 7,
} as const;

export type PaymentProviderOutcome =
  | 'ACCEPTED'
  | 'REFUSED'
  | 'CANCELLED'
  | 'PENDING';
