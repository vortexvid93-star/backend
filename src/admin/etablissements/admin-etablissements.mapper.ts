import type { Etablissement } from '../../../generated/prisma/client';

export function mapAdminEtablissementListItem(
  etablissement: Etablissement & { _count: { membres: number } },
) {
  return {
    id: etablissement.id,
    nom: etablissement.nom,
    email_contact: etablissement.email_contact,
    telephone_contact: etablissement.telephone_contact,
    code_invitation: etablissement.code_invitation,
    nb_users_max: etablissement.nb_users_max,
    nb_membres_actifs: etablissement._count.membres,
    prix: Number(etablissement.prix),
    devise: etablissement.devise,
    duree_jours: etablissement.duree_jours,
    statut: etablissement.statut,
    date_debut: etablissement.date_debut.toISOString(),
    date_fin: etablissement.date_fin.toISOString(),
    createdAt: etablissement.createdAt.toISOString(),
  };
}
