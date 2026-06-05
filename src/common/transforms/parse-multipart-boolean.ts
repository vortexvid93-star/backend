import { Transform } from 'class-transformer';

/** Convertit les champs multipart (`"true"` / `"false"`, tableaux multer) en booléen. */
export function parseMultipartBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[value.length - 1] : value;

  if (typeof raw === 'boolean') {
    return raw;
  }

  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return undefined;
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }

  return undefined;
}

/** Décorateur class-transformer pour booléens envoyés en `multipart/form-data`. */
export function TransformMultipartBoolean() {
  return Transform(({ value }) => parseMultipartBoolean(value), {
    toClassOnly: true,
  });
}
