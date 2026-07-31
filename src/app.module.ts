import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { BookFileStorageModule } from './storage/book-file-storage.module';
import { PrismaModule } from './prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { LibrariesModule } from './libraries/libraries.module';
import { ProfileModule } from './profile/profile.module';
import { PaymentsModule } from './payments/payments.module';
import { EtablissementsModule } from './etablissements/etablissements.module';
import { ChallengesModule } from './challenges/challenges.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { AdminModule } from './admin/admin.module';
import { CronModule } from './cron/cron.module';
import { YoutubeModule } from './youtube/youtube.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PushModule,
    CloudinaryModule,
    BookFileStorageModule,
    AuthModule,
    ProfileModule,
    LibrariesModule,
    BooksModule,
    PaymentsModule,
    EtablissementsModule,
    ChallengesModule,
    DiscoveryModule,
    AdminModule,
    CronModule,
    YoutubeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
