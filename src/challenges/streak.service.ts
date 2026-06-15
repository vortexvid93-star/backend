import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appelé après chaque PATCH /books/:id/progress.
   * Met à jour le streak quotidien et les minutes lues aujourd'hui.
   */
  async updateAfterReading(authId: string, minutesAdded: number): Promise<void> {
    if (minutesAdded <= 0) return;

    const auth = await this.prisma.auth.findUnique({
      where: { id: authId },
      select: {
        personne: {
          select: {
            id: true,
            streak_actuel: true,
            streak_max: true,
            derniere_lecture_date: true,
            minutes_lus_aujourd_hui: true,
          },
        },
      },
    });

    const p = auth?.personne;
    if (!p) return;

    const today = new Date();
    const todayKey = toUtcDateKey(today);
    const lastKey = p.derniere_lecture_date ? toUtcDateKey(p.derniere_lecture_date) : null;
    const yesterdayKey = toUtcDateKey(new Date(today.getTime() - 86_400_000));

    let newStreak = p.streak_actuel;
    let newMinutes = p.minutes_lus_aujourd_hui;

    // Mise à jour streak
    if (lastKey === todayKey) {
      // Déjà lu aujourd'hui — streak inchangé
    } else if (lastKey === yesterdayKey) {
      newStreak += 1; // Hier → on continue la série
    } else {
      newStreak = 1; // Rupture ou première fois
    }

    // Mise à jour minutes du jour (reset si nouveau jour)
    newMinutes = lastKey === todayKey ? newMinutes + minutesAdded : minutesAdded;

    await this.prisma.personne.update({
      where: { id: p.id },
      data: {
        streak_actuel: newStreak,
        streak_max: Math.max(newStreak, p.streak_max),
        derniere_lecture_date: today,
        minutes_lus_aujourd_hui: newMinutes,
      },
    });
  }

  /** Retourne la progression quotidienne et le streak pour l'overview. */
  async getDailyStats(authId: string): Promise<{
    streak_actuel: number;
    streak_max: number;
    objectif_minutes_jour: number;
    minutes_lus_aujourd_hui: number;
    objectif_atteint: boolean;
  }> {
    const auth = await this.prisma.auth.findUnique({
      where: { id: authId },
      select: {
        personne: {
          select: {
            streak_actuel: true,
            streak_max: true,
            objectif_minutes_jour: true,
            minutes_lus_aujourd_hui: true,
            derniere_lecture_date: true,
          },
        },
      },
    });

    const p = auth?.personne;
    if (!p) {
      return {
        streak_actuel: 0,
        streak_max: 0,
        objectif_minutes_jour: 20,
        minutes_lus_aujourd_hui: 0,
        objectif_atteint: false,
      };
    }

    const todayKey = toUtcDateKey(new Date());
    const lastKey = p.derniere_lecture_date ? toUtcDateKey(p.derniere_lecture_date) : null;

    // Si on n'a pas lu aujourd'hui, les minutes du jour sont 0
    const minutesAujordhui = lastKey === todayKey ? p.minutes_lus_aujourd_hui : 0;

    return {
      streak_actuel: p.streak_actuel,
      streak_max: p.streak_max,
      objectif_minutes_jour: p.objectif_minutes_jour,
      minutes_lus_aujourd_hui: minutesAujordhui,
      objectif_atteint: minutesAujordhui >= p.objectif_minutes_jour,
    };
  }

  /** Met à jour l'objectif quotidien de l'utilisateur. */
  async setDailyGoal(authId: string, minutes: number): Promise<void> {
    await this.prisma.auth.update({
      where: { id: authId },
      data: { personne: { update: { objectif_minutes_jour: minutes } } },
    });
  }
}
