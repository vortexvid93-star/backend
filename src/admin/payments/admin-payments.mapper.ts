import type {
  Auth,
  EtablissementOffre,
  Paiement,
  PaiementEtablissement,
  PlanAbonnement,
} from '../../../generated/prisma/client';

type AdminPaymentRow = Paiement & {
  auth: Pick<Auth, 'email'>;
  plan: PlanAbonnement;
};

export function mapAdminPayment(row: AdminPaymentRow) {
  return {
    id: row.id,
    type: 'individuel' as const,
    ref_transaction: row.ref_transaction,
    montant: Number(row.montant),
    devise: row.devise,
    statut: row.statut,
    operateur: row.operateur,
    createdAt: row.createdAt.toISOString(),
    auth: { email: row.auth.email },
    plan: {
      plan: row.plan.plan,
      prix: Number(row.plan.prix),
    },
  };
}

type AdminEtablissementPaymentRow = PaiementEtablissement & {
  offre: EtablissementOffre;
};

/** Normalise un paiement de pack établissement dans la même forme que `mapAdminPayment`,
 * pour qu'il s'affiche dans la même liste/export « Paiements » que les abonnements individuels. */
export function mapAdminEtablissementPayment(row: AdminEtablissementPaymentRow) {
  return {
    id: row.id,
    type: 'etablissement' as const,
    ref_transaction: row.ref_transaction,
    montant: Number(row.montant),
    devise: row.devise,
    statut: row.statut,
    operateur: row.operateur,
    createdAt: row.createdAt.toISOString(),
    auth: { email: `${row.nom_etablissement} · ${row.email_contact}` },
    plan: {
      plan: `Pack établissement · ${row.offre.nom}`,
      prix: Number(row.offre.prix),
    },
  };
}
