import type { Auteur, Categorie } from '../../../generated/prisma/client';
import type { LivreCatalogRow } from '../../books/books.mapper';

function mapAuteursBrief(auteurs: { auteur: Auteur }[]) {
  return auteurs
    .map((row) => row.auteur)
    .filter((auteur) => !auteur.deleted_at)
    .map((auteur) => ({
      id: auteur.id,
      nom: auteur.nom,
      prenom: auteur.prenom,
    }));
}

function mapCategoriesBrief(categories: { categorie: Categorie }[]) {
  return categories
    .map((row) => row.categorie)
    .filter((categorie) => !categorie.deleted_at)
    .map((categorie) => ({
      id: categorie.id,
      nom: categorie.nom,
    }));
}

export function mapAdminBookListItem(livre: LivreCatalogRow) {
  return {
    id: livre.id,
    titre: livre.titre,
    isbn: livre.isbn,
    resume: livre.resume,
    couverture_url: livre.couverture_url,
    type_livre: livre.type_livre,
    is_downloadable: livre.is_downloadable,
    statut: livre.statut,
    langue: livre.langue,
    annee_publication: livre.annee_publication,
    nombre_pages: livre.nombre_pages,
    url_externe_livre: livre.url_externe_livre,
    nb_lectures: livre.statistique?.nb_lectures ?? 0,
    note_moyenne: livre.statistique?.note_moyenne ?? null,
    auteurs: mapAuteursBrief(livre.livre_auteurs),
    categories: mapCategoriesBrief(livre.appartenir),
  };
}
