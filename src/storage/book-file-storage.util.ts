import { extname } from 'node:path';
import { BOOK_FILE_STORAGE_CONSTANTS } from './book-file-storage.constants';

/** Clés R2 incluent l’extension fichier ; les anciennes clés Cloudinary n’en ont pas. */
export function isR2BookObjectKey(objectKey: string): boolean {
  const ext = extname(objectKey).toLowerCase();
  return (
    BOOK_FILE_STORAGE_CONSTANTS.ALLOWED_BOOK_EXTENSIONS as readonly string[]
  ).includes(ext);
}
