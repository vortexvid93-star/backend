import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildPaginationMeta } from '../common/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateChaineDto } from './dto/create-chaine.dto';
import type { VideosQueryDto } from './dto/videos-query.dto';

const YT_API = 'https://www.googleapis.com/youtube/v3';

interface YtChannelItem {
  contentDetails: { relatedPlaylists: { uploads: string } };
  snippet: {
    title: string;
    description: string;
    thumbnails: { default: { url: string } };
  };
}

interface YtPlaylistItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: { videoId: string };
    thumbnails: { medium?: { url: string }; default?: { url: string } };
    tags?: string[];
  };
}

interface YtVideoItem {
  id: string;
  contentDetails: { duration: string };
  statistics: { viewCount: string };
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? '0', 10) * 3600 +
    parseInt(m[2] ?? '0', 10) * 60 +
    parseInt(m[3] ?? '0', 10)
  );
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get apiKey(): string {
    const key = this.config.get<string>('YOUTUBE_API_KEY');
    if (!key)
      throw new Error(
        "YOUTUBE_API_KEY manquante dans les variables d'environnement",
      );
    return key;
  }

  // ─── YouTube Data API helpers ──────────────────────────────────────────────

  /** Retourne l'ID de la playlist "uploads" d'une chaîne (1 quota unit). */
  async getUploadsPlaylistId(channelId: string): Promise<string> {
    const url = new URL(`${YT_API}/channels`);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube channels.list échoué: ${res.status}`);

    const json = (await res.json()) as { items?: YtChannelItem[] };
    const uploadsId =
      json.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId)
      throw new Error(
        `Chaîne introuvable ou sans playlist uploads: ${channelId}`,
      );
    return uploadsId;
  }

  /**
   * Récupère les items d'une playlist depuis YouTube, en s'arrêtant dès qu'on
   * atteint une vidéo publiée avant `publishedAfter` (optimisation quota).
   * 1 quota unit par page de 50 résultats.
   */
  async fetchPlaylistItems(
    playlistId: string,
    publishedAfter?: Date,
  ): Promise<YtPlaylistItem['snippet'][]> {
    const items: YtPlaylistItem['snippet'][] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${YT_API}/playlistItems`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', this.apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString());
      if (!res.ok)
        throw new Error(`YouTube playlistItems.list échoué: ${res.status}`);

      const json = (await res.json()) as {
        items?: YtPlaylistItem[];
        nextPageToken?: string;
      };

      let stop = false;
      for (const item of json.items ?? []) {
        const pubAt = new Date(item.snippet.publishedAt);
        if (publishedAfter && pubAt <= publishedAfter) {
          stop = true;
          break;
        }
        items.push(item.snippet);
      }

      pageToken = stop ? undefined : json.nextPageToken;
    } while (pageToken);

    return items;
  }

  /**
   * Récupère durée et compteur de vues pour un lot de vidéos (1 quota unit / 50 IDs).
   */
  async fetchVideoDetails(
    videoIds: string[],
  ): Promise<Map<string, { duration: number; viewCount: number }>> {
    const details = new Map<string, { duration: number; viewCount: number }>();
    if (videoIds.length === 0) return details;

    // Batch par 50 (limite API)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const url = new URL(`${YT_API}/videos`);
      url.searchParams.set('part', 'contentDetails,statistics');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('key', this.apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`YouTube videos.list échoué: ${res.status}`);

      const json = (await res.json()) as { items?: YtVideoItem[] };
      for (const v of json.items ?? []) {
        details.set(v.id, {
          duration: parseIsoDuration(v.contentDetails.duration),
          viewCount: parseInt(v.statistics?.viewCount ?? '0', 10),
        });
      }
    }

    return details;
  }

  // ─── Synchronisation ────────────────────────────────────────────────────────

  private get maxVideoAgeMonths(): number {
    return this.config.get<number>('YOUTUBE_MAX_VIDEO_AGE_MONTHS') ?? 18;
  }

  async syncChannel(
    chaineId: string,
  ): Promise<{ upserted: number; skipped: number; archived: number }> {
    const chaine = await this.prisma.chaineYoutube.findUnique({
      where: { id: chaineId },
    });
    if (!chaine || !chaine.actif)
      return { upserted: 0, skipped: 0, archived: 0 };

    // Première sync : limiter à maxVideoAgeMonths pour éviter l'import de tout l'historique
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - this.maxVideoAgeMonths);
    const publishedAfter = chaine.last_synced_at ?? cutoffDate;

    const uploadsId = await this.getUploadsPlaylistId(chaine.channel_id);
    const snippets = await this.fetchPlaylistItems(uploadsId, publishedAfter);

    if (snippets.length === 0) {
      await this.prisma.chaineYoutube.update({
        where: { id: chaineId },
        data: { last_synced_at: new Date() },
      });
      return { upserted: 0, skipped: 0, archived: 0 };
    }

    const videoIds = snippets.map((s) => s.resourceId.videoId);
    const detailsMap = await this.fetchVideoDetails(videoIds);

    let upserted = 0;
    let skipped = 0;

    for (const snippet of snippets) {
      const videoId = snippet.resourceId.videoId;
      const details = detailsMap.get(videoId);
      if (!details) {
        skipped++;
        continue;
      }

      const thumbnail =
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        null;

      await this.prisma.videoEducative.upsert({
        where: { video_id: videoId },
        create: {
          video_id: videoId,
          chaine_id: chaineId,
          titre: snippet.title.slice(0, 500),
          description: snippet.description || null,
          thumbnail_url: thumbnail,
          published_at: new Date(snippet.publishedAt),
          duree_secondes: details.duration || null,
          tags: snippet.tags ?? [],
          view_count: BigInt(details.viewCount),
          actif: true,
        },
        update: {
          titre: snippet.title.slice(0, 500),
          thumbnail_url: thumbnail,
          view_count: BigInt(details.viewCount),
          updatedAt: new Date(),
        },
      });
      upserted++;
    }

    // Archiver les vidéos trop anciennes (désactiver sans supprimer)
    const { count: archived } = await this.prisma.videoEducative.updateMany({
      where: {
        chaine_id: chaineId,
        actif: true,
        published_at: { lt: cutoffDate },
      },
      data: { actif: false },
    });

    await this.prisma.chaineYoutube.update({
      where: { id: chaineId },
      data: { last_synced_at: new Date() },
    });

    return { upserted, skipped, archived };
  }

  async syncAllChannels(): Promise<{
    chaines_traitees: number;
    videos_upserted: number;
    videos_archived: number;
    erreurs: number;
  }> {
    const chaines = await this.prisma.chaineYoutube.findMany({
      where: { actif: true },
      select: { id: true },
    });

    let videosUpserted = 0;
    let videosArchived = 0;
    let erreurs = 0;

    for (const { id } of chaines) {
      try {
        const { upserted, archived } = await this.syncChannel(id);
        videosUpserted += upserted;
        videosArchived += archived;
      } catch (err) {
        erreurs++;
        this.logger.warn(`syncChannel échoué pour ${id}: ${String(err)}`);
      }
    }

    return {
      chaines_traitees: chaines.length,
      videos_upserted: videosUpserted,
      videos_archived: videosArchived,
      erreurs,
    };
  }

  // ─── CRUD chaînes (admin) ──────────────────────────────────────────────────

  async createChaine(dto: CreateChaineDto) {
    const existing = await this.prisma.chaineYoutube.findUnique({
      where: { channel_id: dto.channel_id },
    });
    if (existing)
      throw new BadRequestException(
        'Cette chaîne YouTube est déjà référencée.',
      );

    const chaine = await this.prisma.chaineYoutube.create({
      data: {
        channel_id: dto.channel_id,
        nom: dto.nom,
        description: dto.description ?? null,
        thumbnail_url: dto.thumbnail_url ?? null,
        actif: dto.actif ?? true,
      },
    });
    return { id: chaine.id, nom: chaine.nom };
  }

  async listChaines(includeInactive = false) {
    const chaines = await this.prisma.chaineYoutube.findMany({
      where: includeInactive ? {} : { actif: true },
      orderBy: { nom: 'asc' },
      select: {
        id: true,
        channel_id: true,
        nom: true,
        description: true,
        thumbnail_url: true,
        actif: true,
        last_synced_at: true,
        _count: { select: { videos: { where: { actif: true } } } },
      },
    });
    return chaines.map((c) => ({
      ...c,
      nb_videos: c._count.videos,
      _count: undefined,
    }));
  }

  async toggleChaine(id: string, actif: boolean) {
    const chaine = await this.prisma.chaineYoutube.findUnique({
      where: { id },
    });
    if (!chaine) throw new NotFoundException('Chaîne introuvable.');
    await this.prisma.chaineYoutube.update({ where: { id }, data: { actif } });
    return { id, actif };
  }

  async deleteChaine(id: string) {
    const chaine = await this.prisma.chaineYoutube.findUnique({
      where: { id },
    });
    if (!chaine) throw new NotFoundException('Chaîne introuvable.');
    await this.prisma.chaineYoutube.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Lecture vidéos (public) ───────────────────────────────────────────────

  async listVideos(query: VideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      actif: true,
      ...(query.chaine_id ? { chaine_id: query.chaine_id } : {}),
      ...(query.q
        ? { titre: { contains: query.q, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.videoEducative.findMany({
        where,
        orderBy: { published_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          video_id: true,
          titre: true,
          thumbnail_url: true,
          published_at: true,
          duree_secondes: true,
          view_count: true,
          chaine: { select: { id: true, nom: true, thumbnail_url: true } },
        },
      }),
      this.prisma.videoEducative.count({ where }),
    ]);

    return {
      data: rows.map((v) => ({ ...v, view_count: Number(v.view_count) })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getVideo(videoId: string) {
    const video = await this.prisma.videoEducative.findUnique({
      where: { video_id: videoId },
      include: {
        chaine: { select: { id: true, nom: true, thumbnail_url: true } },
      },
    });
    if (!video || !video.actif)
      throw new NotFoundException('Vidéo introuvable.');
    return { ...video, view_count: Number(video.view_count) };
  }
}
