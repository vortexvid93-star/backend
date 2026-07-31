import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client';
import {
  StatutEtablissement,
  TypeNotification,
} from '../../../generated/prisma/enums';
import { buildPaginationMeta } from '../../common/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { mapAdminEtablissementListItem } from './admin-etablissements.mapper';
import type { AdminEtablissementsQueryDto } from './dto/admin-etablissements-query.dto';
import type { AttachMembreDto } from './dto/attach-membre.dto';
import type { CreateAdminEtablissementDto } from './dto/create-admin-etablissement.dto';
import type { ProlongerEtablissementDto } from './dto/prolonger-etablissement.dto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCodeInvitation(): string {
  const bytes = randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `BLNK-${suffix}`;
}

interface EtablissementLockRow {
  nom: string;
  nb_users_max: number;
  date_fin: Date;
}

@Injectable()
export class AdminEtablissementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEtablissements(query: AdminEtablissementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EtablissementWhereInput = {
      ...(query.statut ? { statut: query.statut } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.etablissement.findMany({
        where,
        include: { _count: { select: { membres: { where: { retire_le: null } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.etablissement.count({ where }),
    ]);

    return {
      data: rows.map(mapAdminEtablissementListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async createEtablissement(dto: CreateAdminEtablissementDto) {
    const now = new Date();
    const dateFin = new Date(now);
    dateFin.setDate(dateFin.getDate() + dto.duree_jours);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const etablissement = await this.prisma.etablissement.create({
          data: {
            nom: dto.nom.trim(),
            email_contact: dto.email_contact?.trim() || null,
            telephone_contact: dto.telephone_contact?.trim() || null,
            code_invitation: generateCodeInvitation(),
            nb_users_max: dto.nb_users_max,
            prix: dto.prix,
            devise: dto.devise?.trim() || 'XAF',
            duree_jours: dto.duree_jours,
            statut: StatutEtablissement.ACTIF,
            date_debut: now,
            date_fin: dateFin,
          },
        });
        return mapAdminEtablissementListItem({ ...etablissement, _count: { membres: 0 } });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Impossible de générer un code d’invitation unique.',
    );
  }

  async getEtablissementDetail(id: string) {
    const etablissement = await this.findOrThrow(id);

    const membres = await this.prisma.etablissementMembre.findMany({
      where: { etablissement_id: id, retire_le: null },
      include: { auth: { select: { email: true } } },
      orderBy: { rejoint_le: 'asc' },
    });

    return {
      ...mapAdminEtablissementListItem({
        ...etablissement,
        _count: { membres: membres.length },
      }),
      membres: membres.map((m) => ({
        id: m.id,
        auth_id: m.auth_id,
        email: m.auth.email,
        rejoint_le: m.rejoint_le.toISOString(),
      })),
    };
  }

  async attachMembre(etablissementId: string, dto: AttachMembreDto) {
    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : élimine la course sur la dernière place lors d'un
      // rattachement manuel admin concurrent au rattachement self-service
      // (même mécanisme que EtablissementsService.join()).
      const rows = await tx.$queryRaw<EtablissementLockRow[]>`
        SELECT "nom", "nb_users_max", "date_fin"
        FROM "etablissement"
        WHERE "id" = ${etablissementId}
        FOR UPDATE
      `;
      const etablissement = rows[0];
      if (!etablissement) {
        throw new NotFoundException('Établissement introuvable.');
      }

      const dejaMembre = await tx.etablissementMembre.findFirst({
        where: {
          etablissement_id: etablissementId,
          auth_id: dto.auth_id,
          retire_le: null,
        },
      });
      if (dejaMembre) {
        throw new ConflictException('Cet utilisateur est déjà membre du pack.');
      }

      const nbActifs = await tx.etablissementMembre.count({
        where: { etablissement_id: etablissementId, retire_le: null },
      });
      if (nbActifs >= etablissement.nb_users_max) {
        throw new ConflictException('Ce pack a atteint sa limite de places.');
      }

      const membre = await tx.etablissementMembre.create({
        data: { etablissement_id: etablissementId, auth_id: dto.auth_id },
      });

      await tx.notification.create({
        data: {
          auth_id: dto.auth_id,
          type: TypeNotification.ABONNEMENT,
          titre: 'Pack établissement rejoint',
          contenu: `Vous avez été rattaché au pack établissement ${etablissement.nom}. Accès valide jusqu'au ${etablissement.date_fin.toISOString().slice(0, 10)}.`,
        },
      });

      return { id: membre.id, rejoint_le: membre.rejoint_le };
    });
  }

  async detachMembre(etablissementId: string, membreId: string) {
    const membre = await this.prisma.etablissementMembre.findUnique({
      where: { id: membreId },
      include: { etablissement: true },
    });
    if (!membre || membre.etablissement_id !== etablissementId) {
      throw new NotFoundException('Membre introuvable pour ce pack.');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.etablissementMembre.update({
        where: { id: membreId },
        data: { retire_le: new Date() },
      }),
      this.prisma.notification.create({
        data: {
          auth_id: membre.auth_id,
          type: TypeNotification.ABONNEMENT,
          titre: 'Retiré du pack établissement',
          contenu: `Vous avez été retiré du pack établissement ${membre.etablissement.nom} par un administrateur.`,
        },
      }),
    ]);

    return { id: updated.id, retire_le: updated.retire_le };
  }

  /**
   * Étend `date_fin` de `jours_supplementaires` jours, à partir de la date de
   * fin actuelle si le pack est encore actif, ou de maintenant s'il a déjà
   * expiré (même logique que le renouvellement d'abonnement individuel,
   * `subscriptions.service.ts`). Réactive un pack EXPIRE.
   */
  async prolongerEtablissement(id: string, dto: ProlongerEtablissementDto) {
    const etablissement = await this.findOrThrow(id);
    const now = new Date();
    const base =
      etablissement.date_fin > now ? etablissement.date_fin : now;
    const dateFin = new Date(base);
    dateFin.setDate(dateFin.getDate() + dto.jours_supplementaires);

    const updated = await this.prisma.etablissement.update({
      where: { id },
      data: {
        date_fin: dateFin,
        ...(etablissement.statut === StatutEtablissement.EXPIRE
          ? { statut: StatutEtablissement.ACTIF }
          : {}),
      },
    });

    return {
      id: updated.id,
      statut: updated.statut,
      date_fin: updated.date_fin.toISOString(),
    };
  }

  /**
   * Revenu réel (paiement lié, s'il existe) + engagement de lecture réel des
   * membres (actifs et retirés) — remplace le simple `prix` catalogue affiché
   * jusqu'ici.
   */
  async getEtablissementPerformance(id: string) {
    await this.findOrThrow(id);

    const [paiement, membres] = await Promise.all([
      this.prisma.paiementEtablissement.findUnique({
        where: { etablissement_id: id },
      }),
      this.prisma.etablissementMembre.findMany({
        where: { etablissement_id: id },
        select: { auth_id: true },
      }),
    ]);

    const authIds = membres.map((m) => m.auth_id);

    if (authIds.length === 0) {
      return {
        revenu: paiement
          ? {
              montant: Number(paiement.montant),
              devise: paiement.devise,
              statut: paiement.statut,
              date: paiement.createdAt.toISOString(),
            }
          : null,
        membres: { total: 0, actifs_lecteurs: 0 },
        lecture: { minutes_total: 0, sessions_total: 0 },
        livres_populaires: [],
      };
    }

    const [dureeAgg, lecteursDistincts, topLivres] = await Promise.all([
      this.prisma.sessionLecture.aggregate({
        where: { auth_id: { in: authIds } },
        _sum: { duree_min: true },
        _count: true,
      }),
      this.prisma.sessionLecture.groupBy({
        by: ['auth_id'],
        where: { auth_id: { in: authIds } },
      }),
      this.prisma.sessionLecture.groupBy({
        by: ['livre_id'],
        where: { auth_id: { in: authIds } },
        _count: { livre_id: true },
        orderBy: { _count: { livre_id: 'desc' } },
        take: 5,
      }),
    ]);

    const livres = await this.prisma.livre.findMany({
      where: { id: { in: topLivres.map((l) => l.livre_id) } },
      select: { id: true, titre: true },
    });
    const titreParId = new Map(livres.map((l) => [l.id, l.titre]));

    return {
      revenu: paiement
        ? {
            montant: Number(paiement.montant),
            devise: paiement.devise,
            statut: paiement.statut,
            date: paiement.createdAt.toISOString(),
          }
        : null,
      membres: {
        total: authIds.length,
        actifs_lecteurs: lecteursDistincts.length,
      },
      lecture: {
        minutes_total: dureeAgg._sum.duree_min ?? 0,
        sessions_total: dureeAgg._count,
      },
      livres_populaires: topLivres.map((l) => ({
        titre: titreParId.get(l.livre_id) ?? 'Livre supprimé',
        nb_sessions: l._count.livre_id,
      })),
    };
  }

  private async findOrThrow(id: string) {
    const etablissement = await this.prisma.etablissement.findUnique({
      where: { id },
    });
    if (!etablissement) {
      throw new NotFoundException('Établissement introuvable.');
    }
    return etablissement;
  }
}
