import {
  StatutProgression,
  StatutUserDefi,
  TypeDefi,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';

export type MissionPlanStep = {
  ordre: number;
  code: string;
  libelle: string;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE';
};

export type MissionAnalysis = {
  resume: string;
  type_libelle: string;
  objectif: number;
  plan: MissionPlanStep[];
  criteres_validation: string[];
};

type DefiForPlan = {
  id: string;
  titre: string;
  type: TypeDefi;
  objectif_valeur: number;
  date_debut: Date;
  date_fin: Date;
  categorie?: { nom: string } | null;
  auteur?: { nom: string; prenom: string | null } | null;
  livre?: { id: string; titre: string } | null;
};

const TYPE_LABELS: Record<TypeDefi, string> = {
  [TypeDefi.NB_LIVRES]: 'Nombre de livres terminés',
  [TypeDefi.DUREE_LECTURE]: 'Durée de lecture cumulée',
  [TypeDefi.CATEGORIE]: "Livres d'une catégorie",
  [TypeDefi.AUTEUR]: "Livres d'un auteur",
  [TypeDefi.LIVRE_SPECIFIQUE]: 'Livre spécifique',
};

export function analyzeMission(
  defi: DefiForPlan,
  progression = 0,
): MissionAnalysis {
  const type_libelle = TYPE_LABELS[defi.type] ?? defi.type;
  const plan = buildMissionPlanSteps(defi, progression);
  const criteres_validation = buildValidationCriteria(defi);

  return {
    resume: buildMissionSummary(defi),
    type_libelle,
    objectif: defi.objectif_valeur,
    plan,
    criteres_validation,
  };
}

function buildMissionSummary(defi: DefiForPlan): string {
  switch (defi.type) {
    case TypeDefi.NB_LIVRES:
      return `Terminez ${defi.objectif_valeur} livre(s) avant la fin du défi.`;
    case TypeDefi.DUREE_LECTURE:
      return `Accumulez ${defi.objectif_valeur} minute(s) de lecture pendant la période du défi.`;
    case TypeDefi.CATEGORIE: {
      const nom = defi.categorie?.nom ?? 'la catégorie cible';
      return `Terminez ${defi.objectif_valeur} livre(s) de « ${nom} ».`;
    }
    case TypeDefi.AUTEUR: {
      const nom = defi.auteur
        ? [defi.auteur.prenom, defi.auteur.nom].filter(Boolean).join(' ')
        : "l'auteur cible";
      return `Terminez ${defi.objectif_valeur} livre(s) de ${nom}.`;
    }
    case TypeDefi.LIVRE_SPECIFIQUE:
      return defi.livre
        ? `Terminez le livre « ${defi.livre.titre} ».`
        : 'Terminez le livre associé à ce défi.';
    default:
      return defi.titre;
  }
}

function buildValidationCriteria(defi: DefiForPlan): string[] {
  const base = [
    'Inscription au défi obligatoire avant toute progression.',
    'Seules les actions pendant la période du défi comptent.',
    "La progression ne peut pas dépasser l'objectif.",
  ];

  switch (defi.type) {
    case TypeDefi.NB_LIVRES:
      return [...base, 'Chaque livre doit être marqué comme terminé (100 %).'];
    case TypeDefi.DUREE_LECTURE:
      return [
        ...base,
        'Le temps de lecture est cumulé lors des sessions actives.',
        'Les vitesses de lecture anormales sont rejetées.',
      ];
    case TypeDefi.CATEGORIE:
      return [...base, 'Seuls les livres de la catégorie ciblée comptent.'];
    case TypeDefi.AUTEUR:
      return [...base, "Seuls les livres de l'auteur ciblé comptent."];
    case TypeDefi.LIVRE_SPECIFIQUE:
      return [...base, 'Le livre cible doit être terminé intégralement.'];
    default:
      return base;
  }
}

export function buildMissionPlanSteps(
  defi: DefiForPlan,
  progression: number,
): MissionPlanStep[] {
  const objectif = defi.objectif_valeur;

  if (defi.type === TypeDefi.LIVRE_SPECIFIQUE) {
    const titre = defi.livre?.titre ?? 'le livre cible';
    return [
      {
        ordre: 1,
        code: 'TERMINER_LIVRE',
        libelle: `Lire et terminer « ${titre} »`,
        statut: stepStatus(progression, 0, 1),
      },
    ];
  }

  if (defi.type === TypeDefi.DUREE_LECTURE) {
    const paliers = Math.min(objectif, 5);
    const chunk = Math.ceil(objectif / paliers);
    const steps: MissionPlanStep[] = [];
    for (let i = 0; i < paliers; i++) {
      const seuil = Math.min((i + 1) * chunk, objectif);
      steps.push({
        ordre: i + 1,
        code: 'LIRE_MINUTES',
        libelle: `Atteindre ${seuil} minute(s) de lecture`,
        statut: stepStatus(progression, i * chunk, seuil),
      });
    }
    return steps;
  }

  const steps: MissionPlanStep[] = [];
  for (let i = 1; i <= objectif; i++) {
    let libelle = `Terminer le livre ${i}/${objectif}`;
    if (defi.type === TypeDefi.CATEGORIE) {
      const nom = defi.categorie?.nom ?? 'la catégorie';
      libelle = `Terminer un livre de « ${nom} » (${i}/${objectif})`;
    } else if (defi.type === TypeDefi.AUTEUR) {
      const nom = defi.auteur
        ? [defi.auteur.prenom, defi.auteur.nom].filter(Boolean).join(' ')
        : "l'auteur";
      libelle = `Terminer un livre de ${nom} (${i}/${objectif})`;
    }
    steps.push({
      ordre: i,
      code: 'TERMINER_LIVRE',
      libelle,
      statut: stepStatus(progression, i - 1, i),
    });
  }
  return steps;
}

function stepStatus(
  progression: number,
  seuilBas: number,
  seuilHaut: number,
): MissionPlanStep['statut'] {
  if (progression >= seuilHaut) return 'TERMINE';
  if (progression > seuilBas) return 'EN_COURS';
  return 'A_FAIRE';
}

/** Calcule la progression initiale à partir de l'historique de lecture (période du défi). */
export async function computeInitialMissionProgress(
  tx: Prisma.TransactionClient,
  authId: string,
  defi: {
    type: TypeDefi;
    objectif_valeur: number;
    date_debut: Date;
    categorie_id: string | null;
    auteur_id: string | null;
    livre_id: string | null;
  },
): Promise<number> {
  const since = defi.date_debut;

  if (defi.type === TypeDefi.DUREE_LECTURE) {
    const rows = await tx.progressionLecture.findMany({
      where: {
        auth_id: authId,
        derniere_maj: { gte: since },
        duree_lecture_min: { gt: 0 },
      },
      select: { duree_lecture_min: true },
    });
    const total = rows.reduce((sum, r) => sum + r.duree_lecture_min, 0);
    return Math.min(total, defi.objectif_valeur);
  }

  const completed = await tx.progressionLecture.findMany({
    where: {
      auth_id: authId,
      statut: StatutProgression.TERMINE,
      date_fin: { gte: since },
    },
    select: {
      livre_id: true,
      livre: {
        select: {
          appartenir: { select: { categorie_id: true } },
          livre_auteurs: { select: { auteur_id: true } },
        },
      },
    },
  });

  let count = 0;
  for (const row of completed) {
    switch (defi.type) {
      case TypeDefi.NB_LIVRES:
        count += 1;
        break;
      case TypeDefi.LIVRE_SPECIFIQUE:
        if (row.livre_id === defi.livre_id) count += 1;
        break;
      case TypeDefi.CATEGORIE:
        if (
          defi.categorie_id &&
          row.livre.appartenir.some((a) => a.categorie_id === defi.categorie_id)
        ) {
          count += 1;
        }
        break;
      case TypeDefi.AUTEUR:
        if (
          defi.auteur_id &&
          row.livre.livre_auteurs.some((a) => a.auteur_id === defi.auteur_id)
        ) {
          count += 1;
        }
        break;
      default:
        break;
    }
  }

  return Math.min(count, defi.objectif_valeur);
}

export function isMissionLogicallyComplete(
  progression: number,
  objectif: number,
  statut: StatutUserDefi,
): boolean {
  return (
    statut === StatutUserDefi.COMPLETE ||
    (progression >= objectif && objectif > 0)
  );
}
