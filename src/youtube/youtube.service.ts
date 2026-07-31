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
import type { UpdateChaineDto } from './dto/update-chaine.dto';
import type { VideosQueryDto } from './dto/videos-query.dto';

const YT_API = 'https://www.googleapis.com/youtube/v3';

interface YtChannelItem {
  id?: string;
  contentDetails?: { relatedPlaylists: { uploads: string } };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  snippet: {
    title: string;
    description: string;
    thumbnails: { default?: { url: string }; medium?: { url: string } };
  };
}

interface YtSearchItem {
  id: { channelId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { default?: { url: string }; medium?: { url: string } };
  };
}

export interface ResolvedChannel {
  channel_id: string;
  nom: string;
  description: string;
  thumbnail_url: string | null;
  subscriber_count: number | null;
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

  // ─── Suivi du quota gratuit YouTube Data API (10 000 unités / jour) ────────
  // Compteur en mémoire (remis à zéro au changement de jour UTC et au
  // redémarrage) : suffisant pour repérer une dérive, la sync étant de toute
  // façon bornée par design (cf. fetchLatestPlaylistItems).

  private quotaDay = '';
  private quotaUnitsUsed = 0;
  private searchCallsToday = 0;
  private static readonly DAILY_QUOTA_BUDGET = 10_000;
  private static readonly SEARCH_UNIT_COST = 100;
  /** Plafond absolu de vidéos conservées par chaîne, même en cas de
   * surcharge admin (`max_videos`) — protège le quota. */
  static readonly MAX_VIDEOS_HARD_CAP = 60;
  /** Plafond prudent d'appels search.list/jour (coûteux, déclenchés par un
   * admin) — laisse toujours de la marge pour les syncs automatiques. */
  private static readonly MAX_SEARCH_CALLS_PER_DAY = 30;

  private resetQuotaIfNewDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.quotaDay !== today) {
      this.quotaDay = today;
      this.quotaUnitsUsed = 0;
      this.searchCallsToday = 0;
    }
  }

  private trackQuota(units: number, label: string): void {
    this.resetQuotaIfNewDay();
    this.quotaUnitsUsed += units;
    const pct = Math.round(
      (this.quotaUnitsUsed / YoutubeService.DAILY_QUOTA_BUDGET) * 100,
    );
    if (this.quotaUnitsUsed >= YoutubeService.DAILY_QUOTA_BUDGET * 0.8) {
      this.logger.warn(
        `Quota YouTube API : ${this.quotaUnitsUsed}/${YoutubeService.DAILY_QUOTA_BUDGET} unités utilisées aujourd'hui (${pct}%) — dernier appel: ${label}`,
      );
    }
  }

  // ─── YouTube Data API helpers ──────────────────────────────────────────────

  /** Retourne l'ID de la playlist "uploads" d'une chaîne (1 quota unit). */
  async getUploadsPlaylistId(channelId: string): Promise<string> {
    const url = new URL(`${YT_API}/channels`);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', this.apiKey);

    this.trackQuota(1, 'channels.list (uploads playlist)');
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
   * Récupère les `limit` vidéos les plus récentes d'une playlist — la playlist
   * "uploads" de YouTube est déjà triée newest-first. 1 quota unit par page de
   * 50 (donc 1 unité jusqu'à 50 vidéos, 2 unités au-delà, plafonné à
   * `MAX_VIDEOS_HARD_CAP`).
   */
  async fetchLatestPlaylistItems(
    playlistId: string,
    limit: number,
  ): Promise<YtPlaylistItem['snippet'][]> {
    const target = Math.min(
      Math.max(limit, 1),
      YoutubeService.MAX_VIDEOS_HARD_CAP,
    );
    const items: YtPlaylistItem['snippet'][] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${YT_API}/playlistItems`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set(
        'maxResults',
        String(Math.min(target - items.length, 50)),
      );
      url.searchParams.set('key', this.apiKey);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      this.trackQuota(1, 'playlistItems.list');
      const res = await fetch(url.toString());
      if (!res.ok)
        throw new Error(`YouTube playlistItems.list échoué: ${res.status}`);

      const json = (await res.json()) as {
        items?: YtPlaylistItem[];
        nextPageToken?: string;
      };
      items.push(...(json.items ?? []).map((item) => item.snippet));
      pageToken = json.nextPageToken;
    } while (pageToken && items.length < target);

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

      this.trackQuota(1, 'videos.list');
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

  /** Nombre de vidéos les plus récentes conservées par chaîne (défaut 20). */
  private get maxVideosPerChannel(): number {
    return this.config.get<number>('YOUTUBE_MAX_VIDEOS_PER_CHANNEL') ?? 20;
  }

  /**
   * Ne garde que les `maxVideosPerChannel` vidéos les plus récentes d'une
   * chaîne : coût quota fixe par chaîne (~3 unités), quelle que soit sa
   * taille — au lieu de croître avec tout l'historique importé.
   */
  async syncChannel(
    chaineId: string,
  ): Promise<{ upserted: number; skipped: number; archived: number }> {
    const chaine = await this.prisma.chaineYoutube.findUnique({
      where: { id: chaineId },
    });
    if (!chaine || !chaine.actif)
      return { upserted: 0, skipped: 0, archived: 0 };

    const uploadsId = await this.getUploadsPlaylistId(chaine.channel_id);
    const snippets = await this.fetchLatestPlaylistItems(
      uploadsId,
      chaine.max_videos ?? this.maxVideosPerChannel,
    );

    if (snippets.length === 0) {
      // Réponse vide inhabituelle (chaîne sans vidéo ou aléa API) : on ne
      // désactive rien pour éviter de vider la chaîne sur un faux positif.
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
          actif: true,
          updatedAt: new Date(),
        },
      });
      upserted++;
    }

    // Hors du top N les plus récentes : désactiver (sans supprimer).
    const { count: archived } = await this.prisma.videoEducative.updateMany({
      where: {
        chaine_id: chaineId,
        actif: true,
        video_id: { notIn: videoIds },
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

    const quotaAvant = this.quotaUnitsUsed;
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

    this.logger.log(
      `Coût quota YouTube de cette synchronisation : ~${this.quotaUnitsUsed - quotaAvant} unités ` +
        `(cumul du jour : ${this.quotaUnitsUsed}/${YoutubeService.DAILY_QUOTA_BUDGET}).`,
    );

    return {
      chaines_traitees: chaines.length,
      videos_upserted: videosUpserted,
      videos_archived: videosArchived,
      erreurs,
    };
  }

  // ─── Résolution de chaîne (admin) ──────────────────────────────────────────

  private mapChannelItem(item: YtChannelItem): ResolvedChannel {
    return {
      channel_id: item.id ?? '',
      nom: item.snippet.title,
      description: item.snippet.description ?? '',
      thumbnail_url:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
      subscriber_count:
        item.statistics && !item.statistics.hiddenSubscriberCount
          ? parseInt(item.statistics.subscriberCount ?? '0', 10)
          : null,
    };
  }

  private mapSearchItem(item: YtSearchItem): ResolvedChannel {
    return {
      channel_id: item.id.channelId,
      nom: item.snippet.title,
      description: item.snippet.description ?? '',
      thumbnail_url:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        null,
      subscriber_count: null,
    };
  }

  private async fetchChannelsByIds(ids: string[]): Promise<ResolvedChannel[]> {
    const url = new URL(`${YT_API}/channels`);
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('id', ids.join(','));
    url.searchParams.set('key', this.apiKey);

    this.trackQuota(1, 'channels.list (by id)');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube channels.list échoué: ${res.status}`);
    const json = (await res.json()) as { items?: YtChannelItem[] };
    return (json.items ?? []).map((item) => this.mapChannelItem(item));
  }

  private async fetchChannelByHandle(
    handle: string,
  ): Promise<ResolvedChannel | null> {
    const url = new URL(`${YT_API}/channels`);
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('forHandle', handle);
    url.searchParams.set('key', this.apiKey);

    this.trackQuota(1, 'channels.list (forHandle)');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: YtChannelItem[] };
    const item = json.items?.[0];
    return item ? this.mapChannelItem(item) : null;
  }

  private async fetchChannelByUsername(
    username: string,
  ): Promise<ResolvedChannel | null> {
    const url = new URL(`${YT_API}/channels`);
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('forUsername', username);
    url.searchParams.set('key', this.apiKey);

    this.trackQuota(1, 'channels.list (forUsername)');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: YtChannelItem[] };
    const item = json.items?.[0];
    return item ? this.mapChannelItem(item) : null;
  }

  private async searchChannels(query: string): Promise<ResolvedChannel[]> {
    this.resetQuotaIfNewDay();
    if (this.searchCallsToday >= YoutubeService.MAX_SEARCH_CALLS_PER_DAY) {
      throw new BadRequestException(
        'Limite quotidienne de recherches de chaînes atteinte (protection du ' +
          'quota gratuit YouTube). Réessayez demain, ou collez directement le ' +
          "lien ou l'@identifiant de la chaîne (bien moins coûteux en quota).",
      );
    }
    this.searchCallsToday += 1;

    const url = new URL(`${YT_API}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'channel');
    url.searchParams.set('maxResults', '5');
    url.searchParams.set('q', query);
    url.searchParams.set('key', this.apiKey);

    this.trackQuota(YoutubeService.SEARCH_UNIT_COST, 'search.list');
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube search.list échoué: ${res.status}`);
    const json = (await res.json()) as { items?: YtSearchItem[] };
    return (json.items ?? []).map((item) => this.mapSearchItem(item));
  }

  /**
   * Résout une entrée admin (URL de chaîne, @handle, ou simple nom recherché)
   * en un ou plusieurs candidats — évite d'exiger l'ID technique `UCxxxx…`,
   * introuvable dans l'UI YouTube moderne (@handles).
   */
  async resolveChannels(rawInput: string): Promise<ResolvedChannel[]> {
    const input = rawInput.trim();
    if (!input) return [];

    const idMatch = input.match(/UC[\w-]{22}/);
    if (idMatch) {
      const results = await this.fetchChannelsByIds([idMatch[0]]);
      if (results.length > 0) return results;
    }

    const handleMatch = input.match(/@[\w.-]{3,30}/);
    if (handleMatch) {
      const result = await this.fetchChannelByHandle(handleMatch[0]);
      if (result) return [result];
    }

    const userMatch = input.match(/youtube\.com\/(?:user|c)\/([\w-]+)/i);
    if (userMatch) {
      const result = await this.fetchChannelByUsername(userMatch[1]);
      if (result) return [result];
    }

    const searchTerm = handleMatch ? handleMatch[0].slice(1) : input;
    return this.searchChannels(searchTerm);
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

    // Import immédiat des dernières vidéos — évite d'attendre le cron ou un
    // clic manuel sur "Synchroniser" juste après avoir référencé la chaîne.
    let videosImportees = 0;
    if (chaine.actif) {
      try {
        const sync = await this.syncChannel(chaine.id);
        videosImportees = sync.upserted;
      } catch (err) {
        this.logger.warn(
          `Import immédiat échoué pour la nouvelle chaîne ${chaine.id}: ${String(err)}`,
        );
      }
    }

    return { id: chaine.id, nom: chaine.nom, videos_importees: videosImportees };
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
        max_videos: true,
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

  /**
   * Change le nombre de vidéos conservées pour une chaîne (borné 5-60 par le
   * DTO) puis resynchronise immédiatement pour appliquer la nouvelle limite
   * sans attendre le cron.
   */
  async updateChaine(id: string, dto: UpdateChaineDto) {
    const chaine = await this.prisma.chaineYoutube.findUnique({
      where: { id },
    });
    if (!chaine) throw new NotFoundException('Chaîne introuvable.');

    if (dto.max_videos !== undefined) {
      await this.prisma.chaineYoutube.update({
        where: { id },
        data: { max_videos: dto.max_videos },
      });
    }

    const sync = await this.syncChannel(id);
    return { id, max_videos: dto.max_videos ?? chaine.max_videos, ...sync };
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
