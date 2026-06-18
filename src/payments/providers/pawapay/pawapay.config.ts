import type { ConfigService } from '@nestjs/config';

const SANDBOX_API = 'https://api.sandbox.pawapay.io';
const PRODUCTION_API = 'https://api.pawapay.io';

export function resolvePawaPayApiBase(config: ConfigService): string {
  const explicit = config.get<string>('PAWAPAY_API_URL')?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const mode = config
    .get<string>('PAWAPAY_MODE', 'sandbox')
    .trim()
    .toLowerCase();
  if (mode === 'production' || mode === 'prod' || mode === 'live') {
    return PRODUCTION_API;
  }
  return SANDBOX_API;
}

export function resolvePawaPayPublicBase(config: ConfigService): string {
  return (
    config.get<string>('PAWAPAY_PUBLIC_BASE_URL')?.trim() ||
    config.get<string>('PAYMENT_PUBLIC_BASE_URL')?.trim() ||
    ''
  ).replace(/\/$/, '');
}

export function getPawaPayCallbackUrls(publicBase: string): {
  deposits: string;
  payouts: string;
  refunds: string;
} {
  const base = publicBase.replace(/\/$/, '');
  return {
    deposits: `${base}/api/webhooks/pawapay/deposits`,
    payouts: `${base}/api/webhooks/pawapay/payouts`,
    refunds: `${base}/api/webhooks/pawapay/refunds`,
  };
}

export function isPawaPayProduction(config: ConfigService): boolean {
  const base = resolvePawaPayApiBase(config);
  return base === PRODUCTION_API;
}

/** true = valider uniquement via callback PawaPay (pas de polling / réconciliation auto). */
export function isPawaPayCallbackOnly(config: ConfigService): boolean {
  return config.get<string>('PAWAPAY_CALLBACK_ONLY')?.trim() === 'true';
}

const DEFAULT_RECONCILE_DELAYS_MS = [10_000, 15_000, 20_000] as const;

/** Délais de fallback API si le callback PawaPay n’est pas encore arrivé (mode hybride). */
export function resolvePawaPayReconcileDelaysMs(
  config: ConfigService,
): readonly number[] {
  const raw = config.get<string>('PAWAPAY_RECONCILE_DELAYS_MS')?.trim();
  if (raw) {
    const parsed = raw
      .split(',')
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const legacy = config.get<string>('PAWAPAY_RECONCILE_DELAY_MS')?.trim();
  const single = legacy ? Number.parseInt(legacy, 10) : Number.NaN;
  if (Number.isFinite(single) && single > 0) {
    return [single];
  }

  return DEFAULT_RECONCILE_DELAYS_MS;
}

/** Premier délai de réconciliation (seuil GET /payments/status). */
export function resolvePawaPayReconcileDelayMs(config: ConfigService): number {
  return resolvePawaPayReconcileDelaysMs(config)[0] ?? DEFAULT_RECONCILE_DELAYS_MS[0];
}
