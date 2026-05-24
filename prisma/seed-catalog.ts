import type { PrismaClient } from '../generated/prisma/client';
import {
  StatutBibliotheque,
  StatutLivre,
  TypeBibliotheque,
  TypeLivre,
} from '../generated/prisma/enums';

const SEED = 'SEED-FULL';

export const SEED_CATEGORIES = [
  { nom: `${SEED} — Romans`, description: 'Fiction et romans contemporains.' },
  { nom: `${SEED} — Sciences`, description: 'Sciences et vulgarisation.' },
  { nom: `${SEED} — Histoire`, description: 'Histoire et biographies.' },
  { nom: `${SEED} — Jeunesse`, description: 'Livres pour adolescents.' },
  { nom: `${SEED} — Développement`, description: 'Personal development et soft skills.' },
] as const;

export const SEED_AUTHORS = [
  { nom: 'Kouassi', prenom: 'Aminata', bio: 'Romancière ivoirienne.' },
  { nom: 'Diallo', prenom: 'Moussa', bio: 'Essayiste sur l\'histoire africaine.' },
  { nom: 'Ndiaye', prenom: 'Fatou', bio: 'Auteure jeunesse sénégalaise.' },
  { nom: 'Okonkwo', prenom: 'Chidi', bio: 'Scientifique et vulgarisateur.' },
  { nom: 'Traoré', prenom: 'Ibrahim', bio: 'Coach et auteur motivationnel.' },
] as const;

export const SEED_LIBRARIES = [
  {
    nom: `${SEED} — Bibliothèque principale`,
    description: 'Collection interne BiblioTech.',
    type: TypeBibliotheque.INTERNE,
    couverture_url: 'https://res.cloudinary.com/demo/image/upload/v1/seed/lib-main.jpg',
  },
  {
    nom: `${SEED} — Classiques africains`,
    description: 'Œuvres fondatrices.',
    type: TypeBibliotheque.INTERNE,
    couverture_url: 'https://res.cloudinary.com/demo/image/upload/v1/seed/lib-classics.jpg',
  },
  {
    nom: `${SEED} — Sciences & tech`,
    description: 'STEM et innovation.',
    type: TypeBibliotheque.INTERNE,
  },
  {
    nom: `${SEED} — Jeunesse`,
    description: 'Pour les 12-18 ans.',
    type: TypeBibliotheque.INTERNE,
  },
  {
    nom: `${SEED} — Partenaire externe`,
    description: 'Lien vers catalogue partenaire.',
    type: TypeBibliotheque.EXTERNE,
    url_externe: 'https://example.com/catalogue-partenaire',
  },
] as const;

export const SEED_BOOKS = [
  {
    isbn: `${SEED}-ISBN-001`,
    titre: `${SEED} — Terres d'avenir`,
    resume: 'Un roman sur la migration et l\'espoir.',
    type_livre: TypeLivre.INTERNE,
    nombre_pages: 280,
    annee_publication: 2022,
    is_downloadable: true,
  },
  {
    isbn: `${SEED}-ISBN-002`,
    titre: `${SEED} — Étoiles du Sahel`,
    resume: 'Aventure jeunesse dans le désert.',
    type_livre: TypeLivre.INTERNE,
    nombre_pages: 160,
    annee_publication: 2021,
    is_downloadable: false,
  },
  {
    isbn: `${SEED}-ISBN-003`,
    titre: `${SEED} — Chroniques de l'indépendance`,
    resume: 'Essai historique.',
    type_livre: TypeLivre.INTERNE,
    nombre_pages: 340,
    annee_publication: 2019,
  },
  {
    isbn: `${SEED}-ISBN-004`,
    titre: `${SEED} — Le code des savanes`,
    resume: 'Introduction à la programmation.',
    type_livre: TypeLivre.INTERNE,
    nombre_pages: 220,
    annee_publication: 2023,
    is_downloadable: true,
  },
  {
    isbn: `${SEED}-ISBN-005`,
    titre: `${SEED} — Mindset positif`,
    resume: 'Développement personnel.',
    type_livre: TypeLivre.INTERNE,
    nombre_pages: 190,
    annee_publication: 2024,
  },
  {
    isbn: `${SEED}-ISBN-006`,
    titre: `${SEED} — Ressource externe`,
    resume: 'Livre hébergé chez un partenaire.',
    type_livre: TypeLivre.EXTERNE,
    url_externe_livre: 'https://example.com/livres/ressource-externe',
    nombre_pages: 100,
  },
] as const;

export const SEED_PERSONNES = [
  {
    nom: 'Martin',
    prenom: 'Claire',
    bio: 'Profil seed sans compte auth.',
    genre: 'F' as const,
    ecole: 'Lycée Victor Hugo',
    niveau: 'Terminale',
    points: 120,
  },
  {
    nom: 'Bernard',
    prenom: 'Lucas',
    bio: 'Lecteur passionné de sciences.',
    genre: 'M' as const,
    points: 85,
  },
  {
    nom: 'Petit',
    prenom: 'Émilie',
    genre: 'F' as const,
    ecole: 'Université de Dakar',
    niveau: 'Master 1',
    points: 200,
  },
  {
    nom: 'Robert',
    prenom: 'Thomas',
    genre: 'M' as const,
    points: 45,
  },
  {
    nom: 'Moreau',
    prenom: 'Sophie',
    genre: 'AUTRE' as const,
    bio: 'Bibliophile et bénévole.',
    points: 310,
  },
] as const;

export async function seedCatalog(prisma: PrismaClient) {
  const categories = await Promise.all(
    SEED_CATEGORIES.map((c) =>
      prisma.categorie.upsert({
        where: { nom: c.nom },
        create: c,
        update: { description: c.description, deleted_at: null },
      }),
    ),
  );

  const auteurs = await Promise.all(
    SEED_AUTHORS.map(async (a) => {
      const existing = await prisma.auteur.findFirst({
        where: { nom: a.nom, prenom: a.prenom },
      });
      if (existing) {
        return prisma.auteur.update({
          where: { id: existing.id },
          data: { bio: a.bio, deleted_at: null },
        });
      }
      return prisma.auteur.create({ data: a });
    }),
  );

  const bibliotheques = await Promise.all(
    SEED_LIBRARIES.map(async (lib) => {
      const existing = await prisma.bibliotheque.findFirst({
        where: { nom: lib.nom },
      });
      if (existing) {
        return prisma.bibliotheque.update({
          where: { id: existing.id },
          data: lib,
        });
      }
      return prisma.bibliotheque.create({
        data: { ...lib, statut: StatutBibliotheque.ACTIVE },
      });
    }),
  );

  const livres = await Promise.all(
    SEED_BOOKS.map((book) =>
      prisma.livre.upsert({
        where: { isbn: book.isbn },
        create: {
          ...book,
          couverture_url: `https://res.cloudinary.com/demo/image/upload/v1/seed/${book.isbn}.jpg`,
          cloudinary_public_id:
            book.type_livre === TypeLivre.INTERNE
              ? `seed/livres/${book.isbn}`
              : null,
          statut: StatutLivre.PUBLIE,
          langue: 'Français',
        },
        update: {
          titre: book.titre,
          resume: book.resume,
          statut: StatutLivre.PUBLIE,
        },
      }),
    ),
  );

  const personnes = await Promise.all(
    SEED_PERSONNES.map(async (p, i) => {
      const existing = await prisma.personne.findFirst({
        where: { nom: p.nom, prenom: p.prenom },
        include: { auth: true },
      });
      if (existing?.auth) return existing;
      if (existing) {
        return prisma.personne.update({
          where: { id: existing.id },
          data: { ...p, deleted_at: null },
        });
      }
      return prisma.personne.create({
        data: {
          ...p,
          date_naissance: new Date(`200${i}-0${(i % 9) + 1}-15`),
        },
      });
    }),
  );

  const appartenirRows: { livre_id: string; categorie_id: string }[] = [];
  for (let i = 0; i < livres.length; i++) {
    const cat = categories[i % categories.length];
    appartenirRows.push({ livre_id: livres[i].id, categorie_id: cat.id });
    if (i < categories.length) {
      appartenirRows.push({
        livre_id: livres[i].id,
        categorie_id: categories[(i + 1) % categories.length].id,
      });
    }
  }
  await Promise.all(
    appartenirRows.map((row) =>
      prisma.appartenir.upsert({
        where: {
          livre_id_categorie_id: {
            livre_id: row.livre_id,
            categorie_id: row.categorie_id,
          },
        },
        create: row,
        update: {},
      }),
    ),
  );

  const appartientRows: { bibliotheque_id: string; livre_id: string }[] = [];
  for (let i = 0; i < livres.length; i++) {
    const bib = bibliotheques[i % bibliotheques.length];
    appartientRows.push({ bibliotheque_id: bib.id, livre_id: livres[i].id });
  }
  await Promise.all(
    appartientRows.map((row) =>
      prisma.appartient.upsert({
        where: {
          bibliotheque_id_livre_id: {
            bibliotheque_id: row.bibliotheque_id,
            livre_id: row.livre_id,
          },
        },
        create: row,
        update: {},
      }),
    ),
  );

  const livreAuteurKeySet = new Set<string>();
  const livreAuteurRows: { livre_id: string; auteur_id: string }[] = [];
  for (let i = 0; i < livres.length; i++) {
    const pairs = [
      { livre_id: livres[i].id, auteur_id: auteurs[i % auteurs.length].id },
      { livre_id: livres[i].id, auteur_id: auteurs[(i + 1) % auteurs.length].id },
    ];
    for (const row of pairs) {
      const key = `${row.livre_id}:${row.auteur_id}`;
      if (!livreAuteurKeySet.has(key)) {
        livreAuteurKeySet.add(key);
        livreAuteurRows.push(row);
      }
    }
  }
  await Promise.all(
    livreAuteurRows.map((row) =>
      prisma.livreAuteur.upsert({
        where: {
          livre_id_auteur_id: {
            livre_id: row.livre_id,
            auteur_id: row.auteur_id,
          },
        },
        create: row,
        update: {},
      }),
    ),
  );

  const stats = await Promise.all(
    livres.map((livre, i) =>
      prisma.statistiqueLivre.upsert({
        where: { livre_id: livre.id },
        create: {
          livre_id: livre.id,
          nb_lectures: 50 + i * 12,
          nb_terminees: 20 + i * 3,
          note_moyenne: 3.5 + (i % 5) * 0.3,
          nb_notes: 10 + i * 2,
          nb_lectures_7j: 5 + i,
        },
        update: {
          nb_lectures: 50 + i * 12,
          nb_terminees: 20 + i * 3,
          note_moyenne: 3.5 + (i % 5) * 0.3,
          nb_notes: 10 + i * 2,
          nb_lectures_7j: 5 + i,
        },
      }),
    ),
  );

  return {
    categories: categories.length,
    auteurs: auteurs.length,
    bibliotheques: bibliotheques.length,
    livres: livres.length,
    personnes: personnes.length,
    appartenir: appartenirRows.length,
    appartient: appartientRows.length,
    livreAuteur: livreAuteurRows.length,
    statistiques: stats.length,
    livreIds: livres.map((l) => l.id),
    categorieIds: categories.map((c) => c.id),
    auteurIds: auteurs.map((a) => a.id),
  };
}
