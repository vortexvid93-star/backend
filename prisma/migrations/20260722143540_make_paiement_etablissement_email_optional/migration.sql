-- Rendu facultatif temporairement (PawaPay n'utilise jamais ce champ, seul
-- le téléphone compte pour Mobile Money) — revenu sur cette décision le jour
-- même, voir la migration suivante 20260722145108_..._required_again.
-- Ce nom est déjà enregistré dans `_prisma_migrations` sur Supabase (prod),
-- donc ignoré là-bas ; s'exécute normalement sur une base fraîche.

ALTER TABLE "paiement_etablissement" ALTER COLUMN "email_contact" DROP NOT NULL;
