import { RaisonRecommandation } from '../../generated/prisma/enums';

export type FinishedBookProfile = {
  id: string;
  titre: string;
  categorieIds: string[];
  categorieNoms: string[];
  auteurIds: string[];
  auteurNoms: string[];
};

export type RecommendationContext = {
  finishedBooks: FinishedBookProfile[];
  recentSearchTerms: string[];
};

const RAISON_LABELS: Record<RaisonRecommandation, string> = {
  [RaisonRecommandation.SAME_GENRE]: 'Même genre',
  [RaisonRecommandation.SAME_AUTHOR]: 'Même auteur',
  [RaisonRecommandation.POPULAR]: 'Populaire',
  [RaisonRecommandation.TRENDING]: 'Tendance',
};

export function getRaisonLibelle(raison: RaisonRecommandation): string {
  return RAISON_LABELS[raison] ?? raison;
}

export function buildRecommendationContexte(
  raison: RaisonRecommandation,
  livre: {
    titre: string;
    appartenir: { categorie: { id: string; nom: string } }[];
    livre_auteurs: { auteur: { id: string; nom: string; prenom: string | null } }[];
  },
  ctx: RecommendationContext,
  hint?: { categorie_nom?: string; auteur_nom?: string },
): { type: string; libelle: string } | null {
  if (raison === RaisonRecommandation.SAME_GENRE) {
    const catIds = new Set(
      livre.appartenir.map((a) => a.categorie.id),
    );
    const source = ctx.finishedBooks.find((b) =>
      b.categorieIds.some((id) => catIds.has(id)),
    );
    const nom =
      hint?.categorie_nom ??
      source?.categorieNoms.find((n) => n) ??
      livre.appartenir[0]?.categorie.nom;
    if (nom && source) {
      return {
        type: 'genre',
        libelle: `Parce que vous avez lu « ${source.titre} » (${nom})`,
      };
    }
    if (nom) {
      return { type: 'genre', libelle: `Dans la catégorie « ${nom} »` };
    }
  }

  if (raison === RaisonRecommandation.SAME_AUTHOR) {
    const autIds = new Set(livre.livre_auteurs.map((a) => a.auteur.id));
    const source = ctx.finishedBooks.find((b) =>
      b.auteurIds.some((id) => autIds.has(id)),
    );
    const auteurNom =
      hint?.auteur_nom ??
      source?.auteurNoms[0] ??
      livre.livre_auteurs[0]?.auteur.prenom
        ? `${livre.livre_auteurs[0].auteur.prenom} ${livre.livre_auteurs[0].auteur.nom}`
        : livre.livre_auteurs[0]?.auteur.nom;
    if (auteurNom && source) {
      return {
        type: 'auteur',
        libelle: `Parce que vous avez lu « ${source.titre} » (${auteurNom})`,
      };
    }
    if (auteurNom) {
      return { type: 'auteur', libelle: `Du même auteur : ${auteurNom}` };
    }
  }

  if (raison === RaisonRecommandation.POPULAR) {
    return {
      type: 'popularite',
      libelle: 'Plébiscité par la communauté BiblioTech',
    };
  }

  if (raison === RaisonRecommandation.TRENDING) {
    return {
      type: 'tendance',
      libelle: 'Beaucoup lu ces derniers jours',
    };
  }

  return null;
}
