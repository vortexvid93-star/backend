-- Idempotent par conception (voir 20260718163517_add_session_lecture) : ce nom
-- de migration est déjà enregistré dans _prisma_migrations sur Supabase (prod).
-- email_contact est modélisé NOT NULL directement (état réel actuel de prod ;
-- deux migrations ultérieures du 22/07, hors périmètre de ce rapport, l'ont
-- rendu optionnel puis à nouveau requis).

CREATE TABLE IF NOT EXISTS "etablissement_offre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "nb_users_max" INTEGER NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "duree_jours" INTEGER NOT NULL,
    "statut" "StatutPlan" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etablissement_offre_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_etablissement_offre_statut" ON "etablissement_offre"("statut");

CREATE TABLE IF NOT EXISTS "paiement_etablissement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offre_id" UUID NOT NULL,
    "nom_etablissement" VARCHAR(200) NOT NULL,
    "email_contact" VARCHAR(255) NOT NULL,
    "telephone_contact" VARCHAR(20),
    "montant" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "operateur" VARCHAR(50),
    "numero_telephone" VARCHAR(20),
    "ref_transaction" VARCHAR(200),
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "etablissement_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiement_etablissement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "paiement_etablissement_ref_transaction_key" ON "paiement_etablissement"("ref_transaction");
CREATE UNIQUE INDEX IF NOT EXISTS "paiement_etablissement_etablissement_id_key" ON "paiement_etablissement"("etablissement_id");
CREATE INDEX IF NOT EXISTS "idx_paiement_etab_statut" ON "paiement_etablissement"("statut");

DO $$ BEGIN
    ALTER TABLE "paiement_etablissement" ADD CONSTRAINT "paiement_etablissement_offre_id_fkey"
        FOREIGN KEY ("offre_id") REFERENCES "etablissement_offre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "paiement_etablissement" ADD CONSTRAINT "paiement_etablissement_etablissement_id_fkey"
        FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
