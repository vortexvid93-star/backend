import type { PrismaClient } from '../../generated/prisma/client';

/** Normalise un e-mail (trim + minuscules) pour stockage et comparaison. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Recherche un compte auth par e-mail (insensible à la casse). */
export async function findAuthByEmail(
  prisma: Pick<PrismaClient, 'auth'>,
  email: string,
) {
  const normalized = normalizeEmail(email);
  return prisma.auth.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' } },
  });
}
