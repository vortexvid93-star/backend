import type { PaymentProviderOutcome } from '../../payments.constants';
import type { PawaPayDepositCallback } from './pawapay.types';

/** Réponse check deposit : enveloppe FOUND ou dépôt direct. */
export function extractDepositFromCheckResponse(
  body: Record<string, unknown>,
): PawaPayDepositCallback | null {
  const topStatus = typeof body.status === 'string' ? body.status : null;

  if (topStatus === 'NOT_FOUND') {
    return null;
  }

  if (topStatus === 'FOUND' && body.data && typeof body.data === 'object') {
    return body.data;
  }

  if (typeof body.depositId === 'string' && typeof body.status === 'string') {
    return body;
  }

  return null;
}

export function mapPawaPayDepositStatus(
  status: string,
): PaymentProviderOutcome {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETED') {
    return 'ACCEPTED';
  }
  if (normalized === 'FAILED') {
    return 'REFUSED';
  }
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
    return 'CANCELLED';
  }
  if (
    normalized === 'PROCESSING' ||
    normalized === 'SUBMITTED' ||
    normalized === 'ACCEPTED'
  ) {
    return 'PENDING';
  }
  return 'PENDING';
}
