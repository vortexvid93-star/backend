import { AuthProvider } from '../../generated/prisma/enums';

/**
 * Prisma in-memory qui reproduit les CHECK constraints réelles de
 * check_constraints.sql (chk_auth_credentials + chk_auth_google_verified) :
 * toute écriture violant la contrainte lève une erreur type Prisma P2004,
 * comme le ferait PostgreSQL. Permet de tester le soft-delete et le flux de
 * login contre la même règle métier que la base réelle, sans réseau.
 */
export class PrismaP2004Error extends Error {
  readonly code = 'P2004';
}

export type AuthRow = Record<string, unknown> & {
  id: string;
  email: string;
  personne_id: string;
};

export type PersonneRow = Record<string, unknown> & { id: string };

export class FakePrisma {
  readonly auths = new Map<string, AuthRow>();
  readonly personnes = new Map<string, PersonneRow>();
  private nextId = 0;

  validateAuth(row: Record<string, unknown>): void {
    const provider = row.auth_provider;
    const googleId = row.google_id;
    const hash = row.mot_de_passe_hash;

    const credentialsOk =
      (provider === AuthProvider.LOCAL && googleId == null) ||
      (provider === AuthProvider.GOOGLE && googleId != null && hash == null) ||
      (provider === AuthProvider.HYBRID && googleId != null);

    if (!credentialsOk) {
      throw new PrismaP2004Error('chk_auth_credentials');
    }

    const googleVerifiedOk =
      (provider === AuthProvider.GOOGLE || provider === AuthProvider.HYBRID) &&
      row.email_verified === true;
    if (!googleVerifiedOk && provider !== AuthProvider.LOCAL) {
      throw new PrismaP2004Error('chk_auth_google_verified');
    }
  }

  readonly auth = {
    findUnique: ({
      where,
      include,
    }: {
      where: { id?: string; google_id?: string };
      include?: { personne?: boolean };
    }): AuthRow | null => {
      const row = where.id
        ? this.auths.get(where.id)
        : [...this.auths.values()].find((a) => a.google_id === where.google_id);
      if (!row) return null;
      if (include?.personne) {
        return {
          ...row,
          personne: this.personnes.get(row.personne_id) ?? null,
        };
      }
      return { ...row };
    },

    findFirst: ({
      where,
    }: {
      where: {
        email: { equals: string; mode?: string };
        include?: { personne?: boolean };
      };
    }): AuthRow | null => {
      const needle = String(where.email.equals).toLowerCase();
      const row = [...this.auths.values()].find(
        (a) => a.email.toLowerCase() === needle,
      );
      if (!row) return null;
      return { ...row };
    },

    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }): AuthRow => {
      const row = this.auths.get(where.id);
      if (!row) throw new Error(`auth not found: ${where.id}`);
      const next = { ...row, ...data } as AuthRow;
      this.validateAuth(next);
      this.auths.set(where.id, next);
      return { ...next };
    },

    create: ({
      data,
      include,
    }: {
      data: Record<string, unknown>;
      include?: { personne?: boolean };
    }): AuthRow => {
      const id = (data.id as string) ?? `auth-${++this.nextId}`;
      const row = { ...data, id } as AuthRow;
      this.validateAuth(row);
      this.auths.set(id, row);
      if (include?.personne) {
        return {
          ...row,
          personne: this.personnes.get(row.personne_id) ?? null,
        };
      }
      return { ...row };
    },
  };

  readonly personne = {
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }): PersonneRow => {
      const row = this.personnes.get(where.id);
      if (!row) throw new Error(`personne not found: ${where.id}`);
      const next = { ...row, ...data } as PersonneRow;
      this.personnes.set(where.id, next);
      return { ...next };
    },

    create: ({ data }: { data: Record<string, unknown> }): PersonneRow => {
      const id = (data.id as string) ?? `personne-${++this.nextId}`;
      const row = { ...data, id } as PersonneRow;
      this.personnes.set(id, row);
      return { ...row };
    },
  };

  $transaction = async (
    arg: Array<Promise<unknown>> | ((tx: FakePrisma) => Promise<unknown>),
  ): Promise<unknown> => {
    if (typeof arg === 'function') {
      return arg(this);
    }
    const results: unknown[] = [];
    for (const op of arg) {
      results.push(await op);
    }
    return results;
  };
}

export const GOOGLE_TOKEN_PAYLOAD = {
  sub: 'google-123',
  email: 'original@x.com',
  name: 'Ancien Utilisateur',
  given_name: 'Ancien',
  family_name: 'Utilisateur',
};
