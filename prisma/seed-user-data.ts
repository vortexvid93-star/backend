import type { PrismaClient } from '../generated/prisma/client';
import {
  RaisonRecommandation,
  StatutAbonnement,
  StatutCommentaire,
  StatutPaiement,
  StatutProgression,
  StatutUserDefi,
  TypeNotification,
  TypeRenouvellement,
} from '../generated/prisma/enums';

const SEED = 'SEED-FULL';

interface SeedUserDataContext {
  livreIds: string[];
}

export async function seedUserData(
  prisma: PrismaClient,
  ctx: SeedUserDataContext,
) {
  const authRows = await prisma.auth.findMany({
    take: 10,
    orderBy: { date_inscription: 'asc' },
    include: { personne: true },
  });

  if (authRows.length === 0) {
    return {
      skipped: true,
      reason:
        'Aucun compte auth en base. Créez au moins un utilisateur via POST /auth/register, puis relancez le seed.',
      counts: {} as Record<string, number>,
    };
  }

  const plans = await prisma.planAbonnement.findMany();
  if (plans.length === 0) {
    throw new Error('Plans absents — le seed plans doit tourner avant seed-user-data.');
  }

  const defis = await prisma.defi.findMany({
    where: { titre: { startsWith: 'SEED' } },
    take: 10,
  });

  const badges = await prisma.badge.findMany({
    where: { nom: { startsWith: 'SEED' } },
    take: 10,
  });

  const livreIds =
    ctx.livreIds.length >= 5
      ? ctx.livreIds
      : (await prisma.livre.findMany({ take: 6, select: { id: true } })).map(
          (l) => l.id,
        );

  if (livreIds.length < 5) {
    throw new Error('Pas assez de livres en base pour le seed utilisateur (min. 5).');
  }

  let paiements = 0;
  let abonnements = 0;
  let progressions = 0;
  let commentaires = 0;
  let notifications = 0;
  let historiques = 0;
  let recommandations = 0;
  let notations = 0;
  let userBadges = 0;
  let userDefis = 0;

  const now = new Date();

  for (let i = 0; i < authRows.length; i++) {
    const auth = authRows[i];
    const plan = plans[i % plans.length];

    for (let p = 0; p < 5; p++) {
      const ref = `${SEED}-PAY-${auth.id.slice(0, 8)}-${p}`;
      const existing = await prisma.paiement.findUnique({
        where: { ref_transaction: ref },
      });
      if (existing) {
        paiements += 1;
        continue;
      }

      const statuts = [
        StatutPaiement.SUCCES,
        StatutPaiement.SUCCES,
        StatutPaiement.EN_ATTENTE,
        StatutPaiement.ECHEC,
        StatutPaiement.SUCCES,
      ] as const;

      await prisma.paiement.create({
        data: {
          auth_id: auth.id,
          plan_id: plan.id,
          montant: plan.prix,
          devise: plan.devise,
          operateur: p % 2 === 0 ? 'ORANGE_MONEY' : 'MTN_MOMO',
          numero_telephone: auth.numero_telephone,
          ref_transaction: ref,
          statut: statuts[p],
        },
      });
      paiements += 1;
    }

    const succesPaiements = await prisma.paiement.findMany({
      where: {
        auth_id: auth.id,
        statut: StatutPaiement.SUCCES,
        ref_transaction: { startsWith: SEED },
      },
      take: 5,
      include: { abonnement: true },
    });

    for (let a = 0; a < Math.min(5, succesPaiements.length); a++) {
      const paiement = succesPaiements[a];
      if (paiement.abonnement) {
        abonnements += 1;
        continue;
      }

      const date_debut = new Date(now);
      date_debut.setDate(date_debut.getDate() - (a + 1) * 30);
      const date_fin = new Date(date_debut);
      date_fin.setDate(date_fin.getDate() + plan.duree_jours);

      const statutsAb = [
        StatutAbonnement.ACTIF,
        StatutAbonnement.EXPIRE,
        StatutAbonnement.ANNULE,
        StatutAbonnement.ACTIF,
        StatutAbonnement.EXPIRE,
      ];

      await prisma.abonnement.create({
        data: {
          paiement_id: paiement.id,
          auth_id: auth.id,
          plan_id: plan.id,
          date_debut,
          date_fin:
            a === 0
              ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              : date_fin,
          statut: statutsAb[a % statutsAb.length],
          type_renouvellement:
            a === 0
              ? TypeRenouvellement.NOUVEAU
              : TypeRenouvellement.RENOUVELLEMENT,
        },
      });
      abonnements += 1;
    }

    const statutsProg = [
      StatutProgression.EN_COURS,
      StatutProgression.TERMINE,
      StatutProgression.TERMINE,
      StatutProgression.ABANDONNE,
      StatutProgression.EN_COURS,
      StatutProgression.TERMINE,
    ];

    for (let r = 0; r < 6; r++) {
      const livre_id = livreIds[r % livreIds.length];
      const statut = statutsProg[r];
      const date_fin =
        statut === StatutProgression.TERMINE
          ? new Date(now.getTime() - r * 24 * 60 * 60 * 1000)
          : null;

      await prisma.progressionLecture.upsert({
        where: { auth_id_livre_id: { auth_id: auth.id, livre_id } },
        create: {
          auth_id: auth.id,
          livre_id,
          page_actuelle: statut === StatutProgression.TERMINE ? 100 : 45 + r * 10,
          pourcentage:
            statut === StatutProgression.TERMINE
              ? 100
              : statut === StatutProgression.ABANDONNE
                ? 22
                : 45 + r * 8,
          duree_lecture_min: 30 + r * 25,
          statut,
          date_fin,
          derniere_maj: new Date(now.getTime() - r * 2 * 24 * 60 * 60 * 1000),
        },
        update: {
          statut,
          pourcentage:
            statut === StatutProgression.TERMINE ? 100 : 45 + r * 8,
          duree_lecture_min: 30 + r * 25,
          date_fin,
        },
      });
      progressions += 1;
    }

    const commentTexts = [
      'Roman captivant du début à la fin !',
      'Très instructif, je recommande.',
      'Un peu long mais la fin est magnifique.',
      'Parfait pour les vacances.',
      'Contenu adapté aux ados.',
      'Excellent pour débuter en programmation.',
    ];

    for (let c = 0; c < 5; c++) {
      const livre_id = livreIds[(c + i) % livreIds.length];
      const existing = await prisma.commentaire.findFirst({
        where: {
          auth_id: auth.id,
          livre_id,
          contenu: { startsWith: SEED },
        },
      });
      if (existing) {
        commentaires += 1;
        continue;
      }

      await prisma.commentaire.create({
        data: {
          auth_id: auth.id,
          livre_id,
          contenu: `${SEED} — ${commentTexts[c]}`,
          statut:
            c === 4 ? StatutCommentaire.MODERE : StatutCommentaire.PUBLIE,
        },
      });
      commentaires += 1;
    }

    const notifTypes = [
      TypeNotification.BADGE,
      TypeNotification.DEFI,
      TypeNotification.ABONNEMENT,
      TypeNotification.SYSTEME,
      TypeNotification.SYSTEME,
    ];

    for (let n = 0; n < 5; n++) {
      const titre = `${SEED} — Notification ${n + 1}`;
      const existing = await prisma.notification.findFirst({
        where: { auth_id: auth.id, titre },
      });
      if (existing) {
        notifications += 1;
        continue;
      }

      await prisma.notification.create({
        data: {
          auth_id: auth.id,
          titre,
          contenu: `Message de test seed (${notifTypes[n]}).`,
          type: notifTypes[n],
          lu: n < 2,
        },
      });
      notifications += 1;
    }

    const searchTerms = [
      'roman africain',
      'science jeunesse',
      'histoire indépendance',
      'programmation python',
      'développement personnel',
    ];

    for (let h = 0; h < 5; h++) {
      const terme = `${SEED} ${searchTerms[h]}`;
      const existing = await prisma.historiqueRecherche.findFirst({
        where: { auth_id: auth.id, terme },
      });
      if (existing) {
        historiques += 1;
        continue;
      }

      await prisma.historiqueRecherche.create({
        data: {
          auth_id: auth.id,
          terme,
          nb_resultats: 3 + h,
          a_clique: h % 2 === 0,
        },
      });
      historiques += 1;
    }

    const raisons = [
      RaisonRecommandation.SAME_GENRE,
      RaisonRecommandation.SAME_AUTHOR,
      RaisonRecommandation.POPULAR,
      RaisonRecommandation.TRENDING,
      RaisonRecommandation.POPULAR,
    ];

    for (let rec = 0; rec < 5; rec++) {
      const livre_id = livreIds[(rec + i + 1) % livreIds.length];
      await prisma.recommandation.upsert({
        where: { auth_id_livre_id: { auth_id: auth.id, livre_id } },
        create: {
          auth_id: auth.id,
          livre_id,
          score: (0.75 + rec * 0.04).toFixed(3),
          raison: raisons[rec],
          vu: rec < 2,
          clique: rec === 0,
        },
        update: {
          score: (0.75 + rec * 0.04).toFixed(3),
          raison: raisons[rec],
        },
      });
      recommandations += 1;
    }

    for (let note = 0; note < 5; note++) {
      const livre_id = livreIds[(note + i) % livreIds.length];
      await prisma.noter.upsert({
        where: { auth_id_livre_id: { auth_id: auth.id, livre_id } },
        create: {
          auth_id: auth.id,
          livre_id,
          valeur: 3 + (note % 3),
        },
        update: { valeur: 3 + (note % 3) },
      });
      notations += 1;
    }

    if (badges.length > 0) {
      for (let b = 0; b < Math.min(5, badges.length); b++) {
        await prisma.userBadge.upsert({
          where: {
            auth_id_badge_id: {
              auth_id: auth.id,
              badge_id: badges[b].id,
            },
          },
          create: { auth_id: auth.id, badge_id: badges[b].id },
          update: {},
        });
        userBadges += 1;
      }
    }

    if (defis.length > 0) {
      const statutsDefi = [
        StatutUserDefi.EN_COURS,
        StatutUserDefi.COMPLETE,
        StatutUserDefi.EN_COURS,
        StatutUserDefi.ECHOUE,
        StatutUserDefi.COMPLETE,
      ];

      for (let d = 0; d < Math.min(5, defis.length); d++) {
        const statut = statutsDefi[d];
        await prisma.userDefi.upsert({
          where: {
            auth_id_defi_id: { auth_id: auth.id, defi_id: defis[d].id },
          },
          create: {
            auth_id: auth.id,
            defi_id: defis[d].id,
            progression:
              statut === StatutUserDefi.COMPLETE
                ? defis[d].objectif_valeur
                : Math.floor(defis[d].objectif_valeur / 2),
            statut,
            date_completion:
              statut === StatutUserDefi.COMPLETE ? new Date() : null,
          },
          update: {
            progression:
              statut === StatutUserDefi.COMPLETE
                ? defis[d].objectif_valeur
                : Math.floor(defis[d].objectif_valeur / 2),
            statut,
            date_completion:
              statut === StatutUserDefi.COMPLETE ? new Date() : null,
          },
        });
        userDefis += 1;
      }
    }

    await prisma.personne.update({
      where: { id: auth.personne_id },
      data: {
        points: 150 + i * 50,
        bio: auth.personne.bio ?? `${SEED} — Lecteur actif #${i + 1}`,
      },
    });
  }

  return {
    skipped: false,
    authUtilises: authRows.length,
    counts: {
      paiements,
      abonnements,
      progressions,
      commentaires,
      notifications,
      historiques,
      recommandations,
      notations,
      userBadges,
      userDefis,
    },
  };
}
