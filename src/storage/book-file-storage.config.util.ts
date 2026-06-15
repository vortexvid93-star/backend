import type { ConfigService } from '@nestjs/config';

export type BookStorageBackend = 'r2' | 'cloudinary';

const PLACEHOLDER_MARKERS = [
  'dev-local',
  'local',
  'changeme',
  'placeholder',
  'api_key',
  'api_secret',
  'cloud_name',
  'votre_',
  'your_',
  'xxxx',
  'example',
] as const;

export function isPlaceholderCredential(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function isValidCloudflareAccountId(accountId: string): boolean {
  return /^[a-f0-9]{32}$/i.test(accountId.trim());
}

export function resolveR2Endpoint(
  accountId: string,
  configured?: string,
): string {
  const trimmedAccount = accountId.trim();
  const fallback = isValidCloudflareAccountId(trimmedAccount)
    ? `https://${trimmedAccount}.r2.cloudflarestorage.com`
    : '';

  const raw = configured?.trim();
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const subdomain = host.split('.')[0] ?? '';
    if (
      isPlaceholderCredential(subdomain) ||
      subdomain.startsWith('dev-') ||
      !host.endsWith('.r2.cloudflarestorage.com')
    ) {
      return fallback || raw;
    }
    return url.origin;
  } catch {
    return fallback || raw;
  }
}

export function resolveBookStorageBackend(
  config: ConfigService,
): BookStorageBackend {
  const forced = config.get<string>('BOOK_FILE_STORAGE')?.trim().toLowerCase();
  if (forced === 'cloudinary') return 'cloudinary';
  if (forced === 'r2') return 'r2';

  const accountId = config.get<string>('R2_ACCOUNT_ID') ?? '';
  const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID') ?? '';
  const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY') ?? '';
  const bucket = config.get<string>('R2_BUCKET_NAME') ?? '';

  const r2Ready =
    isValidCloudflareAccountId(accountId) &&
    !isPlaceholderCredential(accessKeyId) &&
    !isPlaceholderCredential(secretAccessKey) &&
    Boolean(bucket.trim());

  return r2Ready ? 'r2' : 'cloudinary';
}

export function isTlsOrNetworkR2Error(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('EPROTO') ||
    message.includes('handshake failure') ||
    message.includes('SSL') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  );
}
