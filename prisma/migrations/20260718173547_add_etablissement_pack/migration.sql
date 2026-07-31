-- Idempotent par conception (voir 20260718163517_add_session_lecture) : ce nom
-- de migration est déjà enregistré dans _prisma_migrations sur Supabase (prod).

DO $$ BEGIN
    CREATE TYPE "StatutEtablissement" AS ENUM ('ACTIF', 'SUSPENDU', 'EXPIRE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "etablissement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "email_contact" VARCHAR(255),
    "telephone_contact" VARCHAR(20),
    "code_invitation" VARCHAR(20) NOT NULL,
    "nb_users_max" INTEGER NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "duree_jours" INTEGER NOT NULL,
    "statut" "StatutEtablissement" NOT NULL DEFAULT 'ACTIF',
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etablissement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "etablissement_code_invitation_key" ON "etablissement"("code_invitation");
CREATE INDEX IF NOT EXISTS "idx_etablissement_statut_fin" ON "etablissement"("statut", "date_fin");

CREATE TABLE IF NOT EXISTS "etablissement_membre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "etablissement_id" UUID NOT NULL,
    "auth_id" UUID NOT NULL,
    "rejoint_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retire_le" TIMESTAMP(3),

    CONSTRAINT "etablissement_membre_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_etab_membre_etablissement_actif" ON "etablissement_membre"("etablissement_id", "retire_le");
CREATE INDEX IF NOT EXISTS "idx_etab_membre_auth_actif" ON "etablissement_membre"("auth_id", "retire_le");

DO $$ BEGIN
    ALTER TABLE "etablissement_membre" ADD CONSTRAINT "etablissement_membre_etablissement_id_fkey"
        FOREIGN KEY ("etablissement_id") REFERENCES "etablissement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "etablissement_membre" ADD CONSTRAINT "etablissement_membre_auth_id_fkey"
        FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
