export type CreneauLecture = 'MATIN' | 'APRES_MIDI' | 'SOIR' | 'NUIT';

export interface ReadingHabitsHeatmapCell {
  jour_semaine: number;
  heure: number;
  nb_sessions: number;
  minutes_total: number;
}

export interface ReadingHabitsResult {
  heatmap: ReadingHabitsHeatmapCell[];
  creneau_prefere: CreneauLecture | null;
  duree_moyenne_session_min: number;
  nb_sessions: number;
  tendance_duree_pct: number | null;
}

export function resolveCreneau(heure: number): CreneauLecture {
  if (heure >= 5 && heure <= 11) return 'MATIN';
  if (heure >= 12 && heure <= 17) return 'APRES_MIDI';
  if (heure >= 18 && heure <= 21) return 'SOIR';
  return 'NUIT';
}

export function computeReadingHabits(
  sessions: { createdAt: Date; duree_min: number }[],
  sessionsPeriodePrecedente: { duree_min: number }[],
): ReadingHabitsResult {
  const heatmapMap = new Map<string, ReadingHabitsHeatmapCell>();
  const creneauCounts: Record<CreneauLecture, number> = {
    MATIN: 0,
    APRES_MIDI: 0,
    SOIR: 0,
    NUIT: 0,
  };
  let totalMinutes = 0;

  for (const s of sessions) {
    const jour_semaine = s.createdAt.getUTCDay();
    const heure = s.createdAt.getUTCHours();
    const key = `${jour_semaine}-${heure}`;
    const cell = heatmapMap.get(key) ?? {
      jour_semaine,
      heure,
      nb_sessions: 0,
      minutes_total: 0,
    };
    cell.nb_sessions += 1;
    cell.minutes_total += s.duree_min;
    heatmapMap.set(key, cell);

    creneauCounts[resolveCreneau(heure)] += 1;
    totalMinutes += s.duree_min;
  }

  const nb_sessions = sessions.length;
  const duree_moyenne_session_min =
    nb_sessions === 0 ? 0 : Math.round((totalMinutes / nb_sessions) * 100) / 100;

  let creneau_prefere: CreneauLecture | null = null;
  let max = 0;
  for (const [creneau, count] of Object.entries(creneauCounts) as [
    CreneauLecture,
    number,
  ][]) {
    if (count > max) {
      max = count;
      creneau_prefere = creneau;
    }
  }

  const moyennePrecedente =
    sessionsPeriodePrecedente.length === 0
      ? null
      : sessionsPeriodePrecedente.reduce((sum, s) => sum + s.duree_min, 0) /
        sessionsPeriodePrecedente.length;

  const tendance_duree_pct =
    moyennePrecedente == null || moyennePrecedente === 0
      ? null
      : Math.round(
          ((duree_moyenne_session_min - moyennePrecedente) / moyennePrecedente) *
            10000,
        ) / 100;

  return {
    heatmap: [...heatmapMap.values()],
    creneau_prefere,
    duree_moyenne_session_min,
    nb_sessions,
    tendance_duree_pct,
  };
}
