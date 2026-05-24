import { BadRequestException } from '@nestjs/common';

const PERIODE_JOURS: Record<string, number> = {
  '7j': 7,
  '30j': 30,
  '90j': 90,
  '365j': 365,
};

export function parsePeriodeJours(
  periode: string | undefined,
  defaut: '7j' | '30j' | '90j' | '365j' = '30j',
): number {
  const key = periode ?? defaut;
  const jours = PERIODE_JOURS[key];
  if (!jours) {
    throw new BadRequestException(
      `Période invalide. Valeurs acceptées : ${Object.keys(PERIODE_JOURS).join(', ')}.`,
    );
  }
  return jours;
}

export function dateDepuisJours(jours: number, at: Date = new Date()): Date {
  const d = new Date(at);
  d.setDate(d.getDate() - jours);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function debutMoisCourant(at: Date = new Date()): Date {
  return new Date(at.getFullYear(), at.getMonth(), 1, 0, 0, 0, 0);
}
