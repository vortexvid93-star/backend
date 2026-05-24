import type {
  Auth,
  Paiement,
  PlanAbonnement,
} from '../../../generated/prisma/client';

type AdminPaymentRow = Paiement & {
  auth: Pick<Auth, 'email'>;
  plan: PlanAbonnement;
};

export function mapAdminPayment(row: AdminPaymentRow) {
  return {
    id: row.id,
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
