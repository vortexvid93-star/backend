import { Logger } from '@nestjs/common';
import type { CronJobName } from './cron.constants';

export type CronJobResult = Record<string, number | string | boolean>;

export async function runCronJob(
  logger: Logger,
  jobName: CronJobName,
  fn: () => Promise<CronJobResult>,
): Promise<CronJobResult | null> {
  const startedAt = Date.now();
  logger.log(`[${jobName}] démarrage`);

  try {
    const result = await fn();
    const durationMs = Date.now() - startedAt;
    logger.log(
      `[${jobName}] terminé en ${durationMs}ms — ${JSON.stringify(result)}`,
    );
    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    logger.error(
      `[${jobName}] échec après ${durationMs}ms: ${String(err)}`,
      err instanceof Error ? err.stack : undefined,
    );
    return null;
  }
}
