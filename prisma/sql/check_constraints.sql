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
