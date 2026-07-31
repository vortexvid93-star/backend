import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChallengesModule } from '../challenges/challenges.module';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminAuteursController } from './auteurs/admin-auteurs.controller';
import { AdminAuteursService } from './auteurs/admin-auteurs.service';
import { AdminBadgesController } from './badges/admin-badges.controller';
import { AdminBadgesService } from './badges/admin-badges.service';
import { AdminBooksController } from './books/admin-books.controller';
import { AdminBooksService } from './books/admin-books.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminChallengesController } from './challenges/admin-challenges.controller';
import { AdminChallengesService } from './challenges/admin-challenges.service';
import { AdminLibrariesController } from './libraries/admin-libraries.controller';
import { AdminLibrariesService } from './libraries/admin-libraries.service';
import { AdminPlansController } from './plans/admin-plans.controller';
import { AdminPlansService } from './plans/admin-plans.service';
import { AdminUsersController } from './users/users.controller';
import { AdminUsersService } from './users/users.service';
import { AdminCommentsController } from './comments/admin-comments.controller';
import { AdminCommentsService } from './comments/admin-comments.service';
import { AdminSubscriptionsController } from './subscriptions/admin-subscriptions.controller';
import { AdminSubscriptionsService } from './subscriptions/admin-subscriptions.service';
import { AdminNotificationsController } from './notifications/admin-notifications.controller';
import { AdminNotificationsService } from './notifications/admin-notifications.service';
import { AdminPaymentsController } from './payments/admin-payments.controller';
import { AdminPaymentsService } from './payments/admin-payments.service';
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminStatsService } from './stats/admin-stats.service';
import { AdminEtablissementsController } from './etablissements/admin-etablissements.controller';
import { AdminEtablissementsService } from './etablissements/admin-etablissements.service';
import { AdminExportController } from './exports/admin-export.controller';
import { AdminExportService } from './exports/admin-export.service';
import { AdminPerformanceController } from './performance/admin-performance.controller';
import { AdminPerformanceService } from './performance/admin-performance.service';

@Module({
  imports: [AuthModule, ChallengesModule],
  controllers: [
    AdminUsersController,
    AdminBooksController,
    AdminLibrariesController,
    AdminAuteursController,
    AdminCategoriesController,
    AdminPlansController,
    AdminChallengesController,
    AdminBadgesController,
    AdminCommentsController,
    AdminSubscriptionsController,
    AdminNotificationsController,
    AdminPaymentsController,
    AdminStatsController,
    AdminEtablissementsController,
    AdminExportController,
    AdminPerformanceController,
  ],
  providers: [
    AdminUsersService,
    AdminBooksService,
    AdminLibrariesService,
    AdminAuteursService,
    AdminCategoriesService,
    AdminPlansService,
    AdminChallengesService,
    AdminBadgesService,
    AdminCommentsService,
    AdminSubscriptionsService,
    AdminNotificationsService,
    AdminPaymentsService,
    AdminStatsService,
    AdminEtablissementsService,
    AdminExportService,
    AdminPerformanceService,
    AdminRoleGuard,
  ],
})
export class AdminModule {}
