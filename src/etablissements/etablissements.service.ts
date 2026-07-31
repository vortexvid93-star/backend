import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatutEtablissement,
  TypeNotification,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthCacheService } from '../auth/services/auth-cache.service';
import { findActiveEtablissementMembre } from './etablissement-access.util';

interface EtablissementLockRow {
  id: string;
  nom: string;
  nb_users_max: number;
  statut: StatutEtablissement;
  date_fin: Date;
}

const JOIN_ATTEMPTS_MAX = 10;
const JOIN_ATTEMPTS_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class EtablissementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authCache: AuthCacheService,
  ) {}

  async join(authId: string, code: string) {
    const attempts = this.authCache.incrementAttempts(
      `etab-join:${authId}`,
      JOIN_ATTEMPTS_WINDOW_SECONDS,
    );
    if (attempts > JOIN_ATTEMPTS_MAX) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : élimine la course sur la dernière place lors de deux
      // rattachements concurrents (limite connue et non résolue du rapport original).
      const rows = await tx.$queryRaw<EtablissementLockRow[]>`
        SELECT "id", "nom", "nb_users_max", "statut", "date_fin"
        FROM "etablissement"
        WHERE "code_invitation" = ${normalizedCode}
        FOR UPDATE
      `;

      const etablissement = rows[0];
      if (!etablissement) {
        throw new NotFoundException('Code d’invitation invalide.');
      }

      if (
        etablissement.statut !== StatutEtablissement.ACTIF ||
        etablissement.date_fin <= new Date()
      ) {
        throw new ForbiddenException('Ce pack établissement n’est plus actif.');
      }

      const dejaMembre = await tx.etablissementMembre.findFirst({
        where: {
          etablissement_id: etablissement.id,
          auth_id: authId,
          retire_le: null,
        },
      });
      if (dejaMembre) {
        throw new ConflictException('Vous êtes déjà membre de ce pack.');
      }

      const nbActifs = await tx.etablissementMembre.count({
        where: { etablissement_id: etablissement.id, retire_le: null },
      });

      if (nbActifs >= etablissement.nb_users_max) {
        throw new ForbiddenException(
          'Ce pack établissement a atteint sa limite de places.',
        );
      }

      const membre = await tx.etablissementMembre.create({
        data: { etablissement_id: etablissement.id, auth_id: authId },
      });

      await tx.notification.create({
        data: {
          auth_id: authId,
          type: TypeNotification.ABONNEMENT,
          titre: 'Pack établissement rejoint',
          contenu: `Vous êtes maintenant membre de ${etablissement.nom}. Accès valide jusqu'au ${etablissement.date_fin.toISOString().slice(0, 10)}.`,
        },
      });

      return {
        id: membre.id,
        etablissement_id: etablissement.id,
        rejoint_le: membre.rejoint_le,
      };
    });
  }

  async getMe(authId: string) {
    const membre = await findActiveEtablissementMembre(this.prisma, authId);
    const now = new Date();
    const actif = Boolean(
      membre &&
        membre.etablissement.statut === StatutEtablissement.ACTIF &&
        membre.etablissement.date_fin > now,
    );

    return {
      actif,
      etablissement:
        membre && actif
          ? {
              id: membre.etablissement.id,
              nom: membre.etablissement.nom,
              date_debut: membre.etablissement.date_debut.toISOString(),
              date_fin: membre.etablissement.date_fin.toISOString(),
            }
          : null,
    };
  }
}
