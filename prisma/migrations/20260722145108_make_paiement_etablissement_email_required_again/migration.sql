-- Revient sur 20260722143540_..._optional dans la même journée : e-mail de
-- contact remis obligatoire. Le UPDATE est une garde défensive pour une base
-- fraîche où une ligne aurait pu être créée avec un e-mail vide entre les deux
-- migrations (sur Supabase prod, aucune ligne n'était concernée : 0/1 au
-- moment de la bascule). Ce nom est déjà enregistré dans `_prisma_migrations`
-- sur prod, donc ignoré là-bas ; s'exécute normalement sur une base fraîche.

UPDATE "paiement_etablissement" SET "email_contact" = '' WHERE "email_contact" IS NULL;
ALTER TABLE "paiement_etablissement" ALTER COLUMN "email_contact" SET NOT NULL;
