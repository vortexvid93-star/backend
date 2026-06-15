-- AlterTable
ALTER TABLE "personne" ADD COLUMN     "derniere_lecture_date" DATE,
ADD COLUMN     "minutes_lus_aujourd_hui" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "objectif_minutes_jour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "streak_actuel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak_max" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "videoEducative" ALTER COLUMN "tags" DROP DEFAULT;
