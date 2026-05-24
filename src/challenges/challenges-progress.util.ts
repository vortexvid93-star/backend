export function computeProgressPercent(
  progression: number,
  objectifValeur: number,
): number {
  if (objectifValeur <= 0) return 0;
  return Math.min(
    100,
    Math.round((progression / objectifValeur) * 10000) / 100,
  );
}

export function computeDaysRemaining(dateFin: Date, now = new Date()): number {
  const ms = dateFin.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isDefiCurrentlyActive(
  dateDebut: Date,
  dateFin: Date,
  now = new Date(),
): boolean {
  return dateDebut <= now && dateFin > now;
}
