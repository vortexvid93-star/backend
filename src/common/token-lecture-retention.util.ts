/** Durée de conservation des `token_lecture` pour le recalcul `nb_lectures_7j` (défaut : 7). */
export const TOKEN_LECTURE_RETENTION_DAYS = (() => {
  const parsed = Number(process.env.TOKEN_LECTURE_RETENTION_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 7;
})();

export function getTokenLectureRetentionCutoff(at: Date = new Date()): Date {
  const cutoff = new Date(at);
  cutoff.setDate(cutoff.getDate() - TOKEN_LECTURE_RETENTION_DAYS);
  return cutoff;
}
