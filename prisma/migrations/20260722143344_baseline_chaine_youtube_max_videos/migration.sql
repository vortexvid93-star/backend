-- Réconciliation de dérive de migration : cette colonne avait été ajoutée en
-- production le 20/07 via `prisma db push` (chantier vidéos éducatives) sans
-- migration trackée. Sur Supabase (prod), ce nom de migration est déjà
-- enregistré dans `_prisma_migrations` avec `applied_steps_count = 0`
-- (marquée "applied" via `prisma migrate resolve --applied`, jamais exécutée
-- réellement) — ce fichier ne sera donc jamais rejoué sur prod. Sur une base
-- fraîche (dev/CI), il s'exécute normalement et ajoute la colonne.

ALTER TABLE "chaineYoutube" ADD COLUMN IF NOT EXISTS "max_videos" INTEGER;
