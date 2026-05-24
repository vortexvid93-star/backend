import type { PrismaClient } from '../generated/prisma/client';
import {
  StatutDefi,
  StatutLivre,
  TypeDefi,
  TypeLivre,
} from '../generated/prisma/enums';

const SEED_EMAIL = 'password@biblio.tech';

const SEED_BADGES = [
  {
    nom: 'SEED — Marathon lecteur',
    icone: 'https://res.cloudinary.com/demo/image/upload/v1/seed/badge-marathon.png',
    couleur: '#E74C3C',
    description: 'Badge pour le défi « lire N livres ».',
    points: 50,
  },
  {
    nom: 'SEED — Chronomètre',
    icone: 'https://res.cloudinary.com/demo/image/upload/v1/seed/badge-duree.png',
    couleur: '#3498DB',
    description: 'Badge pour le défi durée de lecture.',
    points: 40,
  },
  {
    nom: 'SEED — Explorateur',
    icone: 'https://res.cloudinary.com/demo/image/upload/v1/seed/badge-categorie.png',
    couleur: '#2ECC71',
    description: 'Badge pour le défi par catégorie.',
    points: 35,
  },
  {
    nom: 'SEED — Fan club',
    icone: 'https://res.cloudinary.com/demo/image/upload/v1/seed/badge-auteur.png',
    couleur: '#9B59B6',
    description: 'Badge pour le défi par auteur.',
    points: 30,
  },
  {
    nom: 'SEED — Livre du mois',
    icone: 'https://res.cloudinary.com/demo/image/upload/v1/seed/badge-livre.png',
    couleur: '#F39C12',
    description: 'Badge pour le défi livre spécifique.',
    points: 25,
  },
] as const;

type SeedBadge = (typeof SEED_BADGES)[number];

function activeDefiDates() {
  const now = new Date();
  const date_debut = new Date(now);
  date_debut.setDate(date_debut.getDate() - 7);
  const date_fin = new Date(now);
  date_fin.setDate(date_fin.getDate() + 90);
  return { date_debut, date_fin };
}

function expiredDefiDates() {
  const now = new Date();
  const date_debut = new Date(now);
  date_debut.setDate(date_debut.getDate() - 120);
  const date_fin = new Date(now);
  date_fin.setDate(date_fin.getDate() - 1);
  return { date_debut, date_fin };
}

async function upsertBadge(prisma: PrismaClient, data: SeedBadge) {
  return prisma.badge.upsert({
    where: { nom: data.nom },
    create: data,
    update: {
      icone: data.icone,
      couleur: data.couleur,
      description: data.description,
      points: data.points,
    },
  });
}

interface DefiSeedFields {
  description?: string | null;
  type: TypeDefi;
  objectif_valeur: number;
  points_bonus: number;
  date_debut: Date;
  date_fin: Date;
  statut: StatutDefi;
  badge_id: string;
  categorie_id?: string | null;
  auteur_id?: string | null;
  livre_id?: string | null;
}

async function upsertDefiByTitre(
  prisma: PrismaClient,
  titre: string,
  data: DefiSeedFields,
) {
  const existing = await prisma.defi.findFirst({ where: { titre } });
  if (existing) {
    return prisma.defi.update({ where: { id: existing.id }, data: { ...data, titre } });
  }
  return prisma.defi.create({ data: { titre, ...data } });
}

export async function seedChallenges(prisma: PrismaClient) {
  const badges = await Promise.all(SEED_BADGES.map((b) => upsertBadge(prisma, b)));
  const [
    badgeMarathon,
    badgeDuree,
    badgeCategorie,
    badgeAuteur,
    badgeLivre,
  ] = badges;

  const categorie = await prisma.categorie.upsert({
    where: { nom: 'SEED — Romans jeunesse' },
    create: {
      nom: 'SEED — Romans jeunesse',
      description: 'Catégorie de test pour les défis SEED.',
    },
    update: {
      description: 'Catégorie de test pour les défis SEED.',
      deleted_at: null,
    },
  });

  let auteur = await prisma.auteur.findFirst({
    where: { nom: 'SEED Auteur', prenom: 'Test' },
  });
  if (!auteur) {
    auteur = await prisma.auteur.create({
      data: {
        nom: 'SEED Auteur',
        prenom: 'Test',
        bio: 'Auteur fictif pour tester GET /challenges/:id (type AUTEUR).',
      },
    });
  }

  const livre = await prisma.livre.upsert({
    where: { isbn: 'SEED-DEFI-001' },
    create: {
      titre: 'SEED — Le livre du défi',
      isbn: 'SEED-DEFI-001',
      resume: 'Livre de test pour le défi LIVRE_SPECIFIQUE.',
      type_livre: TypeLivre.INTERNE,
      cloudinary_public_id: 'seed/defi-livre-test',
      statut: StatutLivre.PUBLIE,
      langue: 'Français',
      nombre_pages: 120,
    },
    update: {
      titre: 'SEED — Le livre du défi',
      cloudinary_public_id: 'seed/defi-livre-test',
      statut: StatutLivre.PUBLIE,
    },
  });

  const activeDates = activeDefiDates();
  const expiredDates = expiredDefiDates();

  const defis = await Promise.all([
    upsertDefiByTitre(prisma, 'SEED — Lire 3 livres', {
      description: 'Terminez 3 livres avant la fin du défi.',
      type: TypeDefi.NB_LIVRES,
      objectif_valeur: 3,
      points_bonus: 100,
      statut: StatutDefi.ACTIF,
      badge_id: badgeMarathon.id,
      ...activeDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — 120 minutes de lecture', {
      description: 'Accumulez 120 minutes de lecture.',
      type: TypeDefi.DUREE_LECTURE,
      objectif_valeur: 120,
      points_bonus: 80,
      statut: StatutDefi.ACTIF,
      badge_id: badgeDuree.id,
      ...activeDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — 2 livres en Romans jeunesse', {
      description: 'Lisez 2 livres de la catégorie Romans jeunesse.',
      type: TypeDefi.CATEGORIE,
      objectif_valeur: 2,
      points_bonus: 60,
      statut: StatutDefi.ACTIF,
      badge_id: badgeCategorie.id,
      categorie_id: categorie.id,
      ...activeDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — 1 livre de SEED Auteur Test', {
      description: "Lisez un livre de l'auteur de test.",
      type: TypeDefi.AUTEUR,
      objectif_valeur: 1,
      points_bonus: 45,
      statut: StatutDefi.ACTIF,
      badge_id: badgeAuteur.id,
      auteur_id: auteur.id,
      ...activeDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — Terminer le livre du défi', {
      description: 'Terminez le livre « Le livre du défi ».',
      type: TypeDefi.LIVRE_SPECIFIQUE,
      objectif_valeur: 1,
      points_bonus: 30,
      statut: StatutDefi.ACTIF,
      badge_id: badgeLivre.id,
      livre_id: livre.id,
      ...activeDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — Défi expiré (join → 400)', {
      description: 'Défi passé — ne doit pas apparaître dans GET /challenges.',
      type: TypeDefi.NB_LIVRES,
      objectif_valeur: 1,
      points_bonus: 0,
      statut: StatutDefi.ACTIF,
      badge_id: badgeMarathon.id,
      ...expiredDates,
    }),
    upsertDefiByTitre(prisma, 'SEED — Défi annulé', {
      description: 'Défi annulé — absent de la liste active.',
      type: TypeDefi.NB_LIVRES,
      objectif_valeur: 1,
      points_bonus: 0,
      statut: StatutDefi.ANNULE,
      badge_id: badgeMarathon.id,
      ...activeDates,
    }),
  ]);

  const auth = await prisma.auth.findUnique({
    where: { email: SEED_EMAIL },
  });

  if (auth) {
    await prisma.userBadge.upsert({
      where: {
        auth_id_badge_id: {
          auth_id: auth.id,
          badge_id: badgeMarathon.id,
        },
      },
      create: {
        auth_id: auth.id,
        badge_id: badgeMarathon.id,
      },
      update: {},
    });
  }

  const activeCount = defis.filter(
    (d) => d.statut === StatutDefi.ACTIF && d.date_fin > new Date(),
  ).length;

  return {
    badges: badges.length,
    defis: defis.length,
    defisActifsListe: activeCount,
    userBadgePourCompteTest: Boolean(auth),
    emailCompteTest: SEED_EMAIL,
  };
}
