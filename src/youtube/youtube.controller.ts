import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../admin/guards/admin-role.guard';
import { CreateChaineDto } from './dto/create-chaine.dto';
import { ResolveChannelQueryDto } from './dto/resolve-channel-query.dto';
import { UpdateChaineDto } from './dto/update-chaine.dto';
import { VideosQueryDto } from './dto/videos-query.dto';
import { YoutubeService } from './youtube.service';
import { YoutubeSyncJob } from './youtube-sync.job';

// ─── Endpoints publics ────────────────────────────────────────────────────────

@ApiTags('youtube')
@Controller('youtube')
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly youtubeSyncJob: YoutubeSyncJob,
  ) {}

  @Get('videos')
  @HttpCode(HttpStatus.OK)
  listVideos(@Query() query: VideosQueryDto) {
    return this.youtubeService.listVideos(query);
  }

  @Get('videos/:videoId')
  @HttpCode(HttpStatus.OK)
  getVideo(@Param('videoId') videoId: string) {
    return this.youtubeService.getVideo(videoId);
  }

  @Get('channels')
  @HttpCode(HttpStatus.OK)
  listChannels() {
    return this.youtubeService.listChaines(false);
  }
}

// ─── Endpoints admin ──────────────────────────────────────────────────────────

@ApiTags('admin-youtube')
@Controller('admin/youtube')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminYoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly youtubeSyncJob: YoutubeSyncJob,
  ) {}

  @Get('channels')
  @HttpCode(HttpStatus.OK)
  listAllChannels() {
    return this.youtubeService.listChaines(true);
  }

  /** Résout un lien/@handle/nom de chaîne collé par l'admin — évite de devoir
   * trouver soi-même l'ID technique UCxxxx… */
  @Get('channels/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveChannel(@Query() query: ResolveChannelQueryDto) {
    const data = await this.youtubeService.resolveChannels(query.q);
    return { data };
  }

  @Post('channels')
  @HttpCode(HttpStatus.CREATED)
  createChannel(@Body() dto: CreateChaineDto) {
    return this.youtubeService.createChaine(dto);
  }

  /** Change le nombre de vidéos conservées pour cette chaîne (5-60) et
   * resynchronise immédiatement. */
  @Patch('channels/:id')
  @HttpCode(HttpStatus.OK)
  updateChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChaineDto,
  ) {
    return this.youtubeService.updateChaine(id, dto);
  }

  @Patch('channels/:id/activate')
  @HttpCode(HttpStatus.OK)
  activateChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.youtubeService.toggleChaine(id, true);
  }

  @Patch('channels/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivateChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.youtubeService.toggleChaine(id, false);
  }

  @Delete('channels/:id')
  @HttpCode(HttpStatus.OK)
  deleteChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.youtubeService.deleteChaine(id);
  }

  /** Déclenche une synchronisation manuelle immédiate. */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  triggerSync() {
    return this.youtubeSyncJob.run();
  }
}
