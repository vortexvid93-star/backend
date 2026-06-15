import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminYoutubeController,
  YoutubeController,
} from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { YoutubeSyncJob } from './youtube-sync.job';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [YoutubeController, AdminYoutubeController],
  providers: [YoutubeService, YoutubeSyncJob],
  exports: [YoutubeService, YoutubeSyncJob],
})
export class YoutubeModule {}
