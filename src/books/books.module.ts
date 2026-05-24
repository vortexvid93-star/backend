import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BooksAccessService } from './books-access.service';
import { BooksCatalogService } from './books-catalog.service';
import { BooksController } from './books.controller';
import { BooksProgressService } from './books-progress.service';
import { BooksSocialService } from './books-social.service';

@Module({
  imports: [AuthModule, ChallengesModule, DiscoveryModule],
  controllers: [BooksController],
  providers: [
    BooksCatalogService,
    BooksAccessService,
    BooksProgressService,
    BooksSocialService,
    JwtAuthGuard,
  ],
  exports: [BooksCatalogService],
})
export class BooksModule {}
