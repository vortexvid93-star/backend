-- Idempotent par conception : ce nom de migration est déjà enregistré dans
-- _prisma_migrations sur Supabase (prod), appliqué par l'autre version du
-- projet. `apply-migrations-supabase.mjs` ignore les migrations déjà connues
-- par NOM, donc ce fichier ne sera jamais réexécuté sur prod ; il sert
-- uniquement à construire un schéma local/dev correct depuis zéro.

CREATE TABLE IF NOT EXISTS "session_lecture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "duree_min" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_lecture_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_session_lecture_auth" ON "session_lecture"("auth_id", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_session_lecture_created" ON "session_lecture"("createdAt");

DO $$ BEGIN
    ALTER TABLE "session_lecture" ADD CONSTRAINT "session_lecture_auth_id_fkey"
        FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "session_lecture" ADD CONSTRAINT "session_lecture_livre_id_fkey"
        FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
