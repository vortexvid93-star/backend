import { Injectable } from '@nestjs/common';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Injectable()
export class PaymentsService {
  initiate(dto: InitiatePaymentDto) {
    return {
      status: 'pending',
      message: 'Paiement simulé — branchement PSP à prévoir',
      subscriptionId: dto.subscriptionId,
      amount: dto.amount,
      provider: dto.provider ?? 'stub',
    };
  }
}
