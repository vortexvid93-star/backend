import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import {
  getPawaPayCallbackUrls,
  isPawaPayProduction,
  resolvePawaPayApiBase,
  resolvePawaPayPublicBase,
} from './providers/pawapay/pawapay.config';

@Injectable()
export class PawaPayBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PawaPayBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  onModuleInit(): void {
    if (!this.providerFactory.isPawaPayMode()) {
      return;
    }

    const apiBase = resolvePawaPayApiBase(this.config);
    const publicBase = resolvePawaPayPublicBase(this.config);
    const prod = isPawaPayProduction(this.config);
    const tokenSet = Boolean(
      this.config.get<string>('PAWAPAY_API_TOKEN')?.trim(),
    );
    const callbacks = publicBase ? getPawaPayCallbackUrls(publicBase) : null;

    this.logger.log(
      [
        'PawaPay actif',
        `environnement=${prod ? 'PRODUCTION' : 'SANDBOX'}`,
        `api=${apiBase}`,
        `token=${tokenSet ? 'oui' : 'NON (PAWAPAY_API_TOKEN manquant)'}`,
        callbacks
          ? `callback_deposits=${callbacks.deposits}`
          : 'public_base=NON (PAWAPAY_PUBLIC_BASE_URL requis pour callbacks)',
      ].join(' | '),
    );

    if (callbacks) {
      this.logger.log(`Dashboard PawaPay → Deposits: ${callbacks.deposits}`);
    }
  }
}
