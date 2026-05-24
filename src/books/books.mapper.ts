import type {
  Auteur,
  Categorie,
  Commentaire,
  Livre,
  Personne,
  ProgressionLecture,
  StatistiqueLivre,
} from '../../generated/prisma/client';

export type LivreCatalogRow = Livre & {
  livre_auteurs: { auteur: Auteur }[];
  appartenir: { categorie: Categorie }[];
  statistique: StatistiqueLivre | null;
};

function mapAuteursCatalog(auteurs: { auteur: Auteur }[]) {
  return auteurs
    .map((row) => row.auteur)
    .filter((auteur) => !auteur.deleted_at)
    .map((auteur) => ({
      id: auteur.id,
      nom: auteur.nom,
      prenom: auteur.prenom,
    }));
}

function mapCategories(categories: { categorie: Categorie }[]) {
  return categories
    .map((row) => row.categorie)
    .filter((categorie) => !categorie.deleted_at)
    .map((categorie) => ({
      id: categorie.id,
      nom: categorie.nom,
    }));
}

export function mapLivreCatalogItem(livre: LivreCatalogRow) {
  return {
    id: livre.id,
    titre: livre.titre,
    isbn: livre.isbn,
    resume: livre.resume,
    couverture_url: livre.couverture_url,
    type_livre: livre.type_livre,
    is_downloadable: livre.is_downloadable,
    langue: livre.langue,
    annee_publication: livre.annee_publication,
    nombre_pages: livre.nombre_pages,
    auteurs: mapAuteursCatalog(livre.livre_auteurs),
    categories: mapCategories(livre.appartenir),
    note_moyenne: livre.statistique?.note_moyenne ?? null,
    nb_lectures: livre.statistique?.nb_lectures ?? 0,
    nb_lectures_7j: livre.statistique?.nb_lectures_7j ?? 0,
  };
}

/** Liste livres d'une bibliothèque (spec §3.3 — sans nb_lectures_7j). */
export function mapLivreLibraryItem(livre: LivreCatalogRow) {
  const { nb_lectures_7j: _ignored, ...item } = mapLivreCatalogItem(livre);
  return item;
}

export function mapMaProgressionBrief(
  progression: ProgressionLecture | null | undefined,
) {
  if (!progression) return null;

  return {
    page_actuelle: progression.page_actuelle,
    pourcentage: progression.pourcentage,
    statut: progression.statut,
    derniere_maj: progression.derniere_maj.toISOString(),
  };
}

export function mapLivreLibraryItemWithUser(
  livre: LivreCatalogRow,
  progression: ProgressionLecture | null | undefined,
) {
  return {
    ...mapLivreLibraryItem(livre),
    ma_progression: mapMaProgressionBrief(progression),
  };
}

export function mapLivreDetail(
  livre: LivreCatalogRow,
  progression: ProgressionLecture | null,
  maNote: number | null,
  acces?: {
    peut_lire: boolean;
    peut_telecharger: boolean;
    raison_blocage: string | null;
    ressource_disponible: boolean;
    acces_type: string;
  },
) {
  return {
    id: livre.id,
    titre: livre.titre,
    isbn: livre.isbn,
    resume: livre.resume,
    couverture_url: livre.couverture_url,
    type_livre: livre.type_livre,
    is_downloadable: livre.is_downloadable,
    langue: livre.langue,
    annee_publication: livre.annee_publication,
    nombre_pages: livre.nombre_pages,
    auteurs: livre.livre_auteurs
      .map((row) => row.auteur)
      .filter((auteur) => !auteur.deleted_at)
      .map((auteur) => ({
        id: auteur.id,
        nom: auteur.nom,
        prenom: auteur.prenom,
        bio: auteur.bio,
      })),
    categories: mapCategories(livre.appartenir),
    statistiques: {
      note_moyenne: livre.statistique?.note_moyenne ?? null,
      nb_notes: livre.statistique?.nb_notes ?? 0,
      nb_lectures: livre.statistique?.nb_lectures ?? 0,
      nb_terminees: livre.statistique?.nb_terminees ?? 0,
    },
    ma_progression: progression
      ? {
          page_actuelle: progression.page_actuelle,
          pourcentage: progression.pourcentage,
          statut: progression.statut,
          date_telechargement:
            progression.date_telechargement?.toISOString() ?? null,
        }
      : null,
    ma_note: maNote,
    acces: acces ?? null,
  };
}

export function mapProgression(progression: ProgressionLecture) {
  return {
    page_actuelle: progression.page_actuelle,
    pourcentage: progression.pourcentage,
    duree_lecture_min: progression.duree_lecture_min,
    statut: progression.statut,
    date_debut: progression.date_debut.toISOString(),
    date_fin: progression.date_fin?.toISOString() ?? null,
    date_telechargement:
      progression.date_telechargement?.toISOString() ?? null,
  };
}

export function mapProgressionUpdate(progression: ProgressionLecture) {
  return {
    id: progression.id,
    page_actuelle: progression.page_actuelle,
    pourcentage: progression.pourcentage,
    statut: progression.statut,
    date_fin: progression.date_fin?.toISOString() ?? null,
  };
}

export function mapComment(
  comment: Commentaire & {
    auth: { personne: Personne };
  },
) {
  return {
    id: comment.id,
    contenu: comment.contenu,
    createdAt: comment.createdAt.toISOString(),
    auteur: {
      nom: comment.auth.personne.nom,
      prenom: comment.auth.personne.prenom,
      photo_profil_url: comment.auth.personne.photo_profil_url,
    },
  };
}
