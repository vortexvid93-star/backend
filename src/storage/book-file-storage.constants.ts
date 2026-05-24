export const BOOK_FILE_STORAGE_CONSTANTS = {
  FOLDER: 'bibliotech/livres',
  /** Durée des URLs présignées (aligné RG39 / RG40) */
  SIGNED_URL_SECONDS: 2 * 60 * 60,
  MAX_BOOK_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_BOOK_MIME_TYPES: [
    'application/pdf',
    'application/epub+zip',
    'application/vnd.epub+zip',
    'application/x-mobipocket-ebook',
    'application/octet-stream',
  ] as const,
  ALLOWED_BOOK_EXTENSIONS: ['.pdf', '.epub', '.mobi'] as const,
} as const;
