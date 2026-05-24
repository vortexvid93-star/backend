import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockPaymentProvider } from './mock-payment.provider';
import { PawaPayPayProvider } from './pawapay-pay.provider';
import type { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockPaymentProvider,
    private readonly pawapay: PawaPayPayProvider,
  ) {}

  getProvider(): PaymentProvider {
    const mode = this.config.get<string>('PAYMENT_PROVIDER', 'mock');
    if (mode === 'pawapay') return this.pawapay;
    return this.mock;
  }

  getMockProvider(): MockPaymentProvider {
    return this.mock;
  }

  isMockMode(): boolean {
    return this.config.get<string>('PAYMENT_PROVIDER', 'mock') === 'mock';
  }

  isPawaPayMode(): boolean {
    return this.config.get<string>('PAYMENT_PROVIDER', 'mock') === 'pawapay';
  }

  getPawaPayProvider(): PawaPayPayProvider {
    return this.pawapay;
  }
}
