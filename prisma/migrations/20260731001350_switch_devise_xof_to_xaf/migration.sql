-- Congo-Brazzaville utilise le XAF (CEMAC), pas le XOF (UEMOA).
-- Corrige le défaut de colonne + rétro-corrige les lignes déjà enregistrées avec 'XOF'.
ALTER TABLE "planAbonnement" ALTER COLUMN "devise" SET DEFAULT 'XAF';
ALTER TABLE "paiement" ALTER COLUMN "devise" SET DEFAULT 'XAF';
ALTER TABLE "etablissement" ALTER COLUMN "devise" SET DEFAULT 'XAF';
ALTER TABLE "etablissement_offre" ALTER COLUMN "devise" SET DEFAULT 'XAF';
ALTER TABLE "paiement_etablissement" ALTER COLUMN "devise" SET DEFAULT 'XAF';

UPDATE "planAbonnement" SET "devise" = 'XAF' WHERE "devise" = 'XOF';
UPDATE "paiement" SET "devise" = 'XAF' WHERE "devise" = 'XOF';
UPDATE "etablissement" SET "devise" = 'XAF' WHERE "devise" = 'XOF';
UPDATE "etablissement_offre" SET "devise" = 'XAF' WHERE "devise" = 'XOF';
UPDATE "paiement_etablissement" SET "devise" = 'XAF' WHERE "devise" = 'XOF';
