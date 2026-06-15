import {
  BadGatewayException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

export interface PawaPayApiErrorBody {
  status?: string;
  failureReason?: {
    failureCode?: string;
    failureMessage?: string;
  };
  message?: string;
}

export async function pawapayFetchJson<T>(
  url: string,
  options: RequestInit & { token: string },
  logger: Logger,
  logContext?: string,
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const method = fetchOptions.method ?? 'GET';
  if (logContext) {
    logger.log(`PawaPay → ${method} ${url} (${logContext})`);
  }
  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(fetchOptions.headers as Record<string, string>),
    },
  });

  const text = await res.text();
  let parsed: PawaPayApiErrorBody & T;
  try {
    parsed = JSON.parse(text) as PawaPayApiErrorBody & T;
  } catch {
    logger.error(
      `PawaPay réponse non-JSON ${res.status}: ${text.slice(0, 500)}`,
    );
    throw new BadGatewayException('Réponse PawaPay invalide.');
  }

  if (logContext && res.ok) {
    const brief =
      typeof parsed === 'object' && parsed !== null && 'status' in parsed
        ? String((parsed as { status: unknown }).status)
        : 'ok';
    logger.log(`PawaPay ← ${res.status} ${brief} (${logContext})`);
  }

  if (!res.ok) {
    const reason = parsed.failureReason;
    const message =
      reason?.failureMessage ??
      parsed.message ??
      `Erreur PawaPay (${res.status})`;
    const code = reason?.failureCode ?? String(res.status);
    logger.warn(
      `PawaPay ← ${res.status} ${code}: ${message} (${logContext ?? url})`,
    );

    if (res.status === 400 || code.startsWith('INVALID_')) {
      throw new BadRequestException(`PawaPay : ${message}`);
    }
    throw new BadGatewayException(`PawaPay : ${message}`);
  }

  return parsed;
}

/** Message client PawaPay : 4–22 caractères alphanumériques + espaces. */
export function toPawaPayCustomerMessage(text: string): string {
  const cleaned = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 22);

  if (cleaned.length >= 4) {
    return cleaned;
  }
  return 'BiblioTech';
}
