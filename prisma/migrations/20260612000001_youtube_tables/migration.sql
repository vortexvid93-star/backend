-- Migration: YouTube educational videos
-- Tables: chaineYoutube, videoEducative

CREATE TABLE "chaineYoutube" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "channel_id"     VARCHAR(50)  NOT NULL,
    "nom"            VARCHAR(200) NOT NULL,
    "description"    TEXT,
    "thumbnail_url"  VARCHAR(500),
    "actif"          BOOLEAN      NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chaineYoutube_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chaineYoutube_channel_id_key" ON "chaineYoutube"("channel_id");

CREATE TABLE "videoEducative" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "video_id"       VARCHAR(20)  NOT NULL,
    "chaine_id"      UUID         NOT NULL,
    "titre"          VARCHAR(500) NOT NULL,
    "description"    TEXT,
    "thumbnail_url"  VARCHAR(500),
    "published_at"   TIMESTAMP(3) NOT NULL,
    "duree_secondes" INTEGER,
    "tags"           TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "view_count"     BIGINT       NOT NULL DEFAULT 0,
    "actif"          BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "videoEducative_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "videoEducative_video_id_key" ON "videoEducative"("video_id");
CREATE INDEX "videoEducative_chaine_id_idx" ON "videoEducative"("chaine_id");
CREATE INDEX "videoEducative_published_at_idx" ON "videoEducative"("published_at" DESC);

ALTER TABLE "videoEducative"
    ADD CONSTRAINT "videoEducative_chaine_id_fkey"
    FOREIGN KEY ("chaine_id") REFERENCES "chaineYoutube"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
