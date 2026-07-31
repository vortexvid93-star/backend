import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PawaPayPayProvider } from './providers/pawapay-pay.provider';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PawaPayBootstrapService } from './pawapay-bootstrap.service';
import { PawaPayWebhooksController } from './pawapay-webhooks.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [AuthModule, PrismaModule, forwardRef(() => EtablissementsModule)],
  controllers: [
    PlansController,
    PaymentsController,
    PawaPayWebhooksController,
    SubscriptionsController,
  ],
  providers: [
    PlansService,
    PaymentsService,
    SubscriptionsService,
    MockPaymentProvider,
    PawaPayPayProvider,
    PawaPayBootstrapService,
    PaymentProviderFactory,
  ],
  exports: [PaymentsService, SubscriptionsService, PaymentProviderFactory],
})
export class PaymentsModule {}
