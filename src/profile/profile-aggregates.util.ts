import type { Prisma } from '../../generated/prisma/client';
import { ReadingSort } from './dto/reading-query.dto';

export function resolveReadingOrderBy(
  sort: ReadingSort = ReadingSort.DERNIERE_MAJ_DESC,
): Prisma.ProgressionLectureOrderByWithRelationInput {
  switch (sort) {
    case ReadingSort.DATE_FIN_DESC:
      return { date_fin: 'desc' };
    case ReadingSort.POURCENTAGE_DESC:
      return { pourcentage: 'desc' };
    case ReadingSort.DATE_DEBUT_DESC:
      return { date_debut: 'desc' };
    default:
      return { derniere_maj: 'desc' };
  }
}

export function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeReadingStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const daySet = new Set(dates.map(toUtcDayKey));
  const today = new Date();
  let cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  let streak = 0;
  while (daySet.has(toUtcDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

export function groupCountByMonth(
  rows: { date_fin: Date | null }[],
): { mois: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.date_fin) continue;
    const mois = row.date_fin.toISOString().slice(0, 7);
    map.set(mois, (map.get(mois) ?? 0) + 1);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mois, count]) => ({ mois, count }));
}

export function aggregateTopCategories(
  rows: {
    livre: {
      appartenir: { categorie: { id: string; nom: string } }[];
    };
  }[],
  limit = 5,
): { categorie_id: string; nom: string; count: number }[] {
  const counts = new Map<string, { nom: string; count: number }>();

  for (const row of rows) {
    for (const { categorie } of row.livre.appartenir) {
      const existing = counts.get(categorie.id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(categorie.id, { nom: categorie.nom, count: 1 });
      }
    }
  }

  return [...counts.entries()]
    .map(([categorie_id, { nom, count }]) => ({ categorie_id, nom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export const PROFILE_COMPLETION_FIELDS = [
  'photo_profil_url',
  'bio',
  'genre',
  'ecole',
  'niveau',
  'date_naissance',
  'numero_telephone',
] as const;

export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number];

export function computeProfileCompletion(
  personne: {
    photo_profil_url: string | null;
    bio: string | null;
    genre: string | null;
    ecole: string | null;
    niveau: string | null;
    date_naissance: Date | null;
  },
  numero_telephone: string | null,
): {
  pourcentage: number;
  champs_manquants: ProfileCompletionField[];
  champs_completes: ProfileCompletionField[];
} {
  const filled: Record<ProfileCompletionField, boolean> = {
    photo_profil_url: Boolean(personne.photo_profil_url?.trim()),
    bio: Boolean(personne.bio?.trim()),
    genre: personne.genre !== null,
    ecole: Boolean(personne.ecole?.trim()),
    niveau: Boolean(personne.niveau?.trim()),
    date_naissance: personne.date_naissance !== null,
    numero_telephone: Boolean(numero_telephone?.trim()),
  };

  const champs_completes = PROFILE_COMPLETION_FIELDS.filter((k) => filled[k]);
  const champs_manquants = PROFILE_COMPLETION_FIELDS.filter((k) => !filled[k]);
  const pourcentage = Math.round(
    (champs_completes.length / PROFILE_COMPLETION_FIELDS.length) * 100,
  );

  return { pourcentage, champs_manquants, champs_completes };
}
