import type {
  Auth,
  Commentaire,
  Livre,
  Personne,
} from '../../../generated/prisma/client';

type AdminCommentRow = Commentaire & {
  livre: Pick<Livre, 'id' | 'titre'>;
  auth: Auth & { personne: Personne };
};

export function mapAdminComment(row: AdminCommentRow) {
  return {
    id: row.id,
    contenu: row.contenu,
    statut: row.statut,
    createdAt: row.createdAt.toISOString(),
    livre: {
      id: row.livre.id,
      titre: row.livre.titre,
    },
    auteur: {
      email: row.auth.email,
      nom: row.auth.personne.nom,
      prenom: row.auth.personne.prenom,
    },
  };
}
