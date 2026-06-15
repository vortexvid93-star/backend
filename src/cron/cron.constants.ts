export const CRON_JOB_NAMES = {
  EXPIRE_SUBSCRIPTIONS: 'expire-subscriptions',
  CLEANUP_TOKEN_LECTURE: 'cleanup-token-lecture',
  RESET_7J_STATS: 'reset-7j-stats',
  GENERATE_RECOMMENDATIONS: 'generate-recommendations',
  CLEANUP_OTP: 'cleanup-otp',
  CLOSE_EXPIRED_CHALLENGES: 'close-expired-challenges',
  YOUTUBE_SYNC: 'youtube-sync',
} as const;

export type CronJobName = (typeof CRON_JOB_NAMES)[keyof typeof CRON_JOB_NAMES];
