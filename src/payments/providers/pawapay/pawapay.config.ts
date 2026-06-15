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
