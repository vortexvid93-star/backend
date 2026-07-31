import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { EtablissementsController } from './etablissements.controller';
import { EtablissementsService } from './etablissements.service';
import { EtablissementPaymentsService } from './etablissement-payments.service';

@Module({
  imports: [AuthModule, PrismaModule, forwardRef(() => PaymentsModule)],
  controllers: [EtablissementsController],
  providers: [EtablissementsService, EtablissementPaymentsService],
  exports: [EtablissementPaymentsService],
})
export class EtablissementsModule {}
