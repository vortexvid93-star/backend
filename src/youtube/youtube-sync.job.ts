import { Injectable, Logger } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

@Injectable()
export class YoutubeSyncJob {
  private readonly logger = new Logger(YoutubeSyncJob.name);

  constructor(private readonly youtubeService: YoutubeService) {}

  async run(): Promise<{
    chaines_traitees: number;
    videos_upserted: number;
    erreurs: number;
  }> {
    this.logger.log('Début synchronisation YouTube');
    const result = await this.youtubeService.syncAllChannels();
    this.logger.log(
      `Sync terminée — chaînes: ${result.chaines_traitees}, vidéos: ${result.videos_upserted}, erreurs: ${result.erreurs}`,
    );
    return result;
  }
}
