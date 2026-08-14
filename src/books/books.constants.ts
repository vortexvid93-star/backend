export const BOOKS_CONSTANTS = {
  TOKEN_TTL_LECTURE_MINUTES: 15,
  TOKEN_TTL_TELECHARGEMENT_MINUTES: 10,
  MAX_ACTIVE_TOKENS_PER_BOOK: 3,
  CLOUDINARY_SIGNED_URL_SECONDS: 2 * 60 * 60,
  /** RG58 — pages max par minute de lecture déclarée */
  ANTI_CHEAT_MAX_PAGES_PER_MINUTE: 15,
  /** RG58 — saut de page sans durée déclarée */
  ANTI_CHEAT_MAX_PAGES_WITHOUT_DURATION: 100,
  /** Tolérance au-delà de la dernière page (lecteur numérique) */
  PROGRESS_PAGE_MARGIN: 5,
  /**
   * Délai max pour la transaction interactive de generateAccessToken.
   * Au-delà du défaut Prisma (5000 ms), la base distante (pooler Supabase)
   * dépasse régulièrement ce délai en enchaînant ses requêtes séquentielles.
   */
  ACCESS_TOKEN_TRANSACTION_TIMEOUT_MS: 15_000,
} as const;
