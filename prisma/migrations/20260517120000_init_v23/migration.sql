-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GenrePersonne" AS ENUM ('M', 'F', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeBibliotheque" AS ENUM ('INTERNE', 'EXTERNE');

-- CreateEnum
CREATE TYPE "StatutBibliotheque" AS ENUM ('ACTIVE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "TypeLivre" AS ENUM ('INTERNE', 'EXTERNE');

-- CreateEnum
CREATE TYPE "StatutLivre" AS ENUM ('PUBLIE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'HYBRID');

-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthStatut" AS ENUM ('PENDING', 'ACTIF', 'BANNI');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('LOGIN', 'RESET_PASSWORD', 'VERIFY_EMAIL');

-- CreateEnum
CREATE TYPE "TypeAccesToken" AS ENUM ('LECTURE', 'TELECHARGEMENT');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('HEBDOMADAIRE', 'MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "StatutPlan" AS ENUM ('ACTIF', 'INACTIF');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'SUCCES', 'ECHEC');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeRenouvellement" AS ENUM ('NOUVEAU', 'RENOUVELLEMENT', 'UPGRADE');

-- CreateEnum
CREATE TYPE "StatutProgression" AS ENUM ('EN_COURS', 'TERMINE', 'ABANDONNE');

-- CreateEnum
CREATE TYPE "StatutCommentaire" AS ENUM ('PUBLIE', 'MODERE', 'SUPPRIME');

-- CreateEnum
CREATE TYPE "TypeDefi" AS ENUM ('NB_LIVRES', 'DUREE_LECTURE', 'CATEGORIE', 'AUTEUR', 'LIVRE_SPECIFIQUE');

-- CreateEnum
CREATE TYPE "StatutDefi" AS ENUM ('ACTIF', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('BADGE', 'DEFI', 'ABONNEMENT', 'SYSTEME');

-- CreateEnum
CREATE TYPE "RaisonRecommandation" AS ENUM ('SAME_GENRE', 'SAME_AUTHOR', 'POPULAR', 'TRENDING');

-- CreateEnum
CREATE TYPE "StatutUserDefi" AS ENUM ('EN_COURS', 'COMPLETE', 'ECHOUE');

-- CreateTable
CREATE TABLE "personne" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "date_naissance" DATE,
    "photo_profil_url" VARCHAR(500),
    "bio" TEXT,
    "genre" "GenrePersonne",
    "ecole" VARCHAR(200),
    "niveau" VARCHAR(100),
    "points" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(150) NOT NULL,
    "icone" VARCHAR(500) NOT NULL,
    "couleur" VARCHAR(7) NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planAbonnement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan" "PlanType" NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL,
    "statut" "StatutPlan" NOT NULL DEFAULT 'ACTIF',
    "duree_jours" INTEGER NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planAbonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bibliotheque" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "couverture_url" VARCHAR(500),
    "type" "TypeBibliotheque" NOT NULL,
    "url_externe" VARCHAR(1000),
    "statut" "StatutBibliotheque" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bibliotheque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auteur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(200) NOT NULL,
    "prenom" VARCHAR(200),
    "bio" TEXT,
    "deleted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titre" VARCHAR(300) NOT NULL,
    "isbn" VARCHAR(20),
    "resume" TEXT,
    "couverture_url" VARCHAR(500),
    "type_livre" "TypeLivre" NOT NULL,
    "cloudinary_public_id" VARCHAR(500),
    "url_externe_livre" VARCHAR(1000),
    "is_downloadable" BOOLEAN NOT NULL DEFAULT false,
    "langue" VARCHAR(50) NOT NULL DEFAULT 'Français',
    "annee_publication" INTEGER,
    "nombre_pages" INTEGER,
    "statut" "StatutLivre" NOT NULL DEFAULT 'PUBLIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "personne_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "numero_telephone" VARCHAR(20),
    "mot_de_passe_hash" VARCHAR(255),
    "google_id" VARCHAR(255),
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "role" "AuthRole" NOT NULL DEFAULT 'USER',
    "statut" "AuthStatut" NOT NULL DEFAULT 'PENDING',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniere_connexion" TIMESTAMP(3),
    "refresh_token" VARCHAR(500),
    "refresh_token_expires_at" TIMESTAMP(3),
    "jti" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "type" "OtpType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_lecture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "type_acces" "TypeAccesToken" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "operateur" VARCHAR(50),
    "numero_telephone" VARCHAR(20),
    "ref_transaction" VARCHAR(200),
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paiement_id" UUID NOT NULL,
    "auth_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "type_renouvellement" "TypeRenouvellement" NOT NULL DEFAULT 'NOUVEAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progressionLecture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "page_actuelle" INTEGER NOT NULL DEFAULT 0,
    "pourcentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duree_lecture_min" INTEGER NOT NULL DEFAULT 0,
    "statut" "StatutProgression" NOT NULL DEFAULT 'EN_COURS',
    "derniere_maj" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "date_telechargement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progressionLecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaire" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "contenu" TEXT NOT NULL,
    "statut" "StatutCommentaire" NOT NULL DEFAULT 'PUBLIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatistiqueLivre" (
    "livre_id" UUID NOT NULL,
    "nb_lectures" INTEGER NOT NULL DEFAULT 0,
    "nb_terminees" INTEGER NOT NULL DEFAULT 0,
    "note_moyenne" DOUBLE PRECISION,
    "nb_notes" INTEGER NOT NULL DEFAULT 0,
    "nb_lectures_7j" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatistiqueLivre_pkey" PRIMARY KEY ("livre_id")
);

-- CreateTable
CREATE TABLE "defi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titre" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "TypeDefi" NOT NULL,
    "objectif_valeur" INTEGER NOT NULL,
    "points_bonus" INTEGER NOT NULL DEFAULT 0,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutDefi" NOT NULL DEFAULT 'ACTIF',
    "badge_id" UUID NOT NULL,
    "categorie_id" UUID,
    "livre_id" UUID,
    "auteur_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "titre" VARCHAR(200) NOT NULL,
    "contenu" TEXT,
    "type" "TypeNotification" NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueRecherche" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "terme" VARCHAR(300) NOT NULL,
    "nb_resultats" INTEGER NOT NULL DEFAULT 0,
    "a_clique" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueRecherche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommandation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "score" DECIMAL(4,3) NOT NULL,
    "raison" "RaisonRecommandation" NOT NULL,
    "vu" BOOLEAN NOT NULL DEFAULT false,
    "clique" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommandation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appartenir" (
    "livre_id" UUID NOT NULL,
    "categorie_id" UUID NOT NULL,

    CONSTRAINT "appartenir_pkey" PRIMARY KEY ("livre_id","categorie_id")
);

-- CreateTable
CREATE TABLE "appartient" (
    "bibliotheque_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,

    CONSTRAINT "appartient_pkey" PRIMARY KEY ("bibliotheque_id","livre_id")
);

-- CreateTable
CREATE TABLE "LivreAuteur" (
    "livre_id" UUID NOT NULL,
    "auteur_id" UUID NOT NULL,

    CONSTRAINT "LivreAuteur_pkey" PRIMARY KEY ("livre_id","auteur_id")
);

-- CreateTable
CREATE TABLE "noter" (
    "auth_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "valeur" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noter_pkey" PRIMARY KEY ("auth_id","livre_id")
);

-- CreateTable
CREATE TABLE "userbadge" (
    "auth_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userbadge_pkey" PRIMARY KEY ("auth_id","badge_id")
);

-- CreateTable
CREATE TABLE "userdefi" (
    "auth_id" UUID NOT NULL,
    "defi_id" UUID NOT NULL,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "statut" "StatutUserDefi" NOT NULL DEFAULT 'EN_COURS',
    "date_completion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userdefi_pkey" PRIMARY KEY ("auth_id","defi_id")
);

-- CreateIndex
CREATE INDEX "idx_personne_active" ON "personne"("id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "badge_nom_key" ON "badge"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "categorie_nom_key" ON "categorie"("nom");

-- CreateIndex
CREATE INDEX "idx_categorie_active" ON "categorie"("id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "planAbonnement_plan_key" ON "planAbonnement"("plan");

-- CreateIndex
CREATE INDEX "idx_auteur_nom" ON "auteur"("nom");

-- CreateIndex
CREATE INDEX "idx_auteur_active" ON "auteur"("id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "livre_isbn_key" ON "livre"("isbn");

-- CreateIndex
CREATE INDEX "idx_livre_titre" ON "livre"("titre");

-- CreateIndex
CREATE INDEX "idx_livre_statut" ON "livre"("statut");

-- CreateIndex
CREATE INDEX "idx_livre_type" ON "livre"("type_livre");

-- CreateIndex
CREATE INDEX "idx_livre_downloadable" ON "livre"("is_downloadable") WHERE (is_downloadable = TRUE);

-- CreateIndex
CREATE UNIQUE INDEX "auth_personne_id_key" ON "auth"("personne_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_email_key" ON "auth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_google_id_key" ON "auth"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_jti_key" ON "auth"("jti");

-- CreateIndex
CREATE INDEX "idx_auth_email" ON "auth"("email");

-- CreateIndex
CREATE INDEX "idx_auth_statut" ON "auth"("statut");

-- CreateIndex
CREATE INDEX "idx_auth_provider" ON "auth"("auth_provider");

-- CreateIndex
CREATE INDEX "idx_auth_email_verified" ON "auth"("email_verified") WHERE (email_verified = FALSE);

-- CreateIndex
CREATE INDEX "idx_otp_auth_type_active" ON "otp"("auth_id", "type") WHERE (used = FALSE);

-- CreateIndex
CREATE INDEX "idx_otp_email_type_recent" ON "otp"("email", "type", "createdAt");

-- CreateIndex
CREATE INDEX "idx_otp_expires" ON "otp"("expires_at") WHERE (used = FALSE);

-- CreateIndex
CREATE UNIQUE INDEX "token_lecture_token_key" ON "token_lecture"("token");

-- CreateIndex
CREATE INDEX "idx_token_lecture_token" ON "token_lecture"("token") WHERE (used = FALSE);

-- CreateIndex
CREATE INDEX "idx_token_lecture_expires" ON "token_lecture"("expires_at") WHERE (used = FALSE);

-- CreateIndex
CREATE INDEX "idx_token_lecture_auth" ON "token_lecture"("auth_id", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "paiement_ref_transaction_key" ON "paiement"("ref_transaction");

-- CreateIndex
CREATE INDEX "idx_paiement_auth" ON "paiement"("auth_id");

-- CreateIndex
CREATE INDEX "idx_paiement_statut" ON "paiement"("statut");

-- CreateIndex
CREATE INDEX "idx_paiement_plan" ON "paiement"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "abonnement_paiement_id_key" ON "abonnement"("paiement_id");

-- CreateIndex
CREATE INDEX "idx_abonnement_auth_statut_fin" ON "abonnement"("auth_id", "statut", "date_fin");

-- CreateIndex
CREATE INDEX "idx_abonnement_type" ON "abonnement"("type_renouvellement");

-- CreateIndex
CREATE INDEX "idx_progression_auth" ON "progressionLecture"("auth_id");

-- CreateIndex
CREATE INDEX "idx_progression_livre" ON "progressionLecture"("livre_id");

-- CreateIndex
CREATE INDEX "idx_progression_statut" ON "progressionLecture"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "progressionLecture_auth_id_livre_id_key" ON "progressionLecture"("auth_id", "livre_id");

-- CreateIndex
CREATE INDEX "idx_commentaire_livre" ON "commentaire"("livre_id");

-- CreateIndex
CREATE INDEX "idx_commentaire_auth" ON "commentaire"("auth_id");

-- CreateIndex
CREATE INDEX "idx_defi_statut" ON "defi"("statut");

-- CreateIndex
CREATE INDEX "idx_defi_type" ON "defi"("type");

-- CreateIndex
CREATE INDEX "idx_notification_auth" ON "notification"("auth_id");

-- CreateIndex
CREATE INDEX "idx_notification_lu" ON "notification"("auth_id", "lu") WHERE (lu = FALSE);

-- CreateIndex
CREATE INDEX "idx_historique_auth" ON "HistoriqueRecherche"("auth_id");

-- CreateIndex
CREATE INDEX "idx_historique_date" ON "HistoriqueRecherche"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_historique_no_result" ON "HistoriqueRecherche"("nb_resultats") WHERE (nb_resultats = 0);

-- CreateIndex
CREATE INDEX "idx_recommandation_auth" ON "recommandation"("auth_id");

-- CreateIndex
CREATE INDEX "idx_recommandation_score" ON "recommandation"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "recommandation_auth_id_livre_id_key" ON "recommandation"("auth_id", "livre_id");

-- CreateIndex
CREATE INDEX "idx_userdefi_statut" ON "userdefi"("statut");

-- AddForeignKey
ALTER TABLE "auth" ADD CONSTRAINT "auth_personne_id_fkey" FOREIGN KEY ("personne_id") REFERENCES "personne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_lecture" ADD CONSTRAINT "token_lecture_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_lecture" ADD CONSTRAINT "token_lecture_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "paiement_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planAbonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_paiement_id_fkey" FOREIGN KEY ("paiement_id") REFERENCES "paiement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planAbonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressionLecture" ADD CONSTRAINT "progressionLecture_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progressionLecture" ADD CONSTRAINT "progressionLecture_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT "StatistiqueLivre_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defi" ADD CONSTRAINT "defi_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defi" ADD CONSTRAINT "defi_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defi" ADD CONSTRAINT "defi_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defi" ADD CONSTRAINT "defi_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "auteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueRecherche" ADD CONSTRAINT "HistoriqueRecherche_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandation" ADD CONSTRAINT "recommandation_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommandation" ADD CONSTRAINT "recommandation_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartenir" ADD CONSTRAINT "appartenir_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartenir" ADD CONSTRAINT "appartenir_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartient" ADD CONSTRAINT "appartient_bibliotheque_id_fkey" FOREIGN KEY ("bibliotheque_id") REFERENCES "bibliotheque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appartient" ADD CONSTRAINT "appartient_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivreAuteur" ADD CONSTRAINT "LivreAuteur_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivreAuteur" ADD CONSTRAINT "LivreAuteur_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "auteur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noter" ADD CONSTRAINT "noter_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noter" ADD CONSTRAINT "noter_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userbadge" ADD CONSTRAINT "userbadge_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userbadge" ADD CONSTRAINT "userbadge_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userdefi" ADD CONSTRAINT "userdefi_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userdefi" ADD CONSTRAINT "userdefi_defi_id_fkey" FOREIGN KEY ("defi_id") REFERENCES "defi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints v2.3

-- Contraintes CHECK v2.3 (idempotent — peut être relancé sans erreur)

DO $$ BEGIN
  ALTER TABLE personne ADD CONSTRAINT personne_points_check CHECK (points >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE badge ADD CONSTRAINT badge_points_check CHECK (points >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "planAbonnement" ADD CONSTRAINT planAbonnement_prix_check CHECK (prix > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "planAbonnement" ADD CONSTRAINT planAbonnement_duree_jours_check CHECK (duree_jours > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bibliotheque ADD CONSTRAINT chk_bibliotheque_url CHECK (
    (type = 'EXTERNE' AND url_externe IS NOT NULL) OR
    (type = 'INTERNE' AND url_externe IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE livre ADD CONSTRAINT livre_annee_publication_check CHECK (annee_publication IS NULL OR annee_publication > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE livre ADD CONSTRAINT livre_nombre_pages_check CHECK (nombre_pages IS NULL OR nombre_pages > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE livre ADD CONSTRAINT chk_livre_type CHECK (
    (type_livre = 'INTERNE' AND cloudinary_public_id IS NOT NULL AND url_externe_livre IS NULL) OR
    (type_livre = 'EXTERNE' AND url_externe_livre IS NOT NULL AND cloudinary_public_id IS NULL AND is_downloadable = FALSE)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE auth ADD CONSTRAINT auth_numero_telephone_check CHECK (
    numero_telephone IS NULL OR numero_telephone ~ '^\+?[0-9]{8,15}$'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE auth ADD CONSTRAINT chk_auth_credentials CHECK (
    (auth_provider = 'LOCAL' AND google_id IS NULL) OR
    (auth_provider = 'GOOGLE' AND google_id IS NOT NULL AND mot_de_passe_hash IS NULL) OR
    (auth_provider = 'HYBRID' AND google_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE auth ADD CONSTRAINT chk_auth_google_verified CHECK (
    (auth_provider IN ('GOOGLE', 'HYBRID') AND email_verified = TRUE) OR
    (auth_provider = 'LOCAL')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE paiement ADD CONSTRAINT paiement_montant_check CHECK (montant >= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE abonnement ADD CONSTRAINT abonnement_dates_check CHECK (date_fin > date_debut);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "progressionLecture" ADD CONSTRAINT progressionLecture_page_actuelle_check CHECK (page_actuelle >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "progressionLecture" ADD CONSTRAINT progressionLecture_pourcentage_check CHECK (pourcentage >= 0 AND pourcentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "progressionLecture" ADD CONSTRAINT progressionLecture_duree_lecture_min_check CHECK (duree_lecture_min >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "progressionLecture" ADD CONSTRAINT chk_progression_date_fin CHECK (
    (statut = 'TERMINE' AND date_fin IS NOT NULL) OR
    (statut != 'TERMINE' AND date_fin IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT statistiqueLivre_nb_lectures_check CHECK (nb_lectures >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT statistiqueLivre_nb_terminees_check CHECK (nb_terminees >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT statistiqueLivre_note_moyenne_check CHECK (
    note_moyenne IS NULL OR (note_moyenne >= 1 AND note_moyenne <= 5)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT statistiqueLivre_nb_notes_check CHECK (nb_notes >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StatistiqueLivre" ADD CONSTRAINT statistiqueLivre_nb_lectures_7j_check CHECK (nb_lectures_7j >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT defi_objectif_valeur_check CHECK (objectif_valeur > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT defi_points_bonus_check CHECK (points_bonus >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT defi_dates_check CHECK (date_fin > date_debut);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT chk_defi_categorie CHECK (
    (type = 'CATEGORIE' AND categorie_id IS NOT NULL) OR (type != 'CATEGORIE')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT chk_defi_auteur CHECK (
    (type = 'AUTEUR' AND auteur_id IS NOT NULL) OR (type != 'AUTEUR')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT chk_defi_livre CHECK (
    (type = 'LIVRE_SPECIFIQUE' AND livre_id IS NOT NULL) OR (type != 'LIVRE_SPECIFIQUE')
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE defi ADD CONSTRAINT chk_defi_exclusivite CHECK (
    (type IN ('NB_LIVRES', 'DUREE_LECTURE') AND categorie_id IS NULL AND livre_id IS NULL AND auteur_id IS NULL) OR
    (type = 'CATEGORIE' AND categorie_id IS NOT NULL AND livre_id IS NULL AND auteur_id IS NULL) OR
    (type = 'AUTEUR' AND auteur_id IS NOT NULL AND categorie_id IS NULL AND livre_id IS NULL) OR
    (type = 'LIVRE_SPECIFIQUE' AND livre_id IS NOT NULL AND categorie_id IS NULL AND auteur_id IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "HistoriqueRecherche" ADD CONSTRAINT historiqueRecherche_nb_resultats_check CHECK (nb_resultats >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE recommandation ADD CONSTRAINT recommandation_score_check CHECK (score >= 0 AND score <= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE noter ADD CONSTRAINT noter_valeur_check CHECK (valeur >= 1 AND valeur <= 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE userdefi ADD CONSTRAINT userdefi_progression_check CHECK (progression >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE userdefi ADD CONSTRAINT chk_userdefi_completion CHECK (
    (statut = 'COMPLETE' AND date_completion IS NOT NULL) OR
    (statut = 'ECHOUE' AND date_completion IS NULL) OR
    (statut = 'EN_COURS' AND date_completion IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
