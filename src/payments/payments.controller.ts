import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SWAGGER_TAGS } from '../common/swagger/constants';
import { ActiveAccountGuard } from '../auth/guards/active-account.guard';
import { JwtAuthenticatedGuard } from '../auth/guards/jwt-authenticated.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/services/token.service';
import { CheckoutPreviewQueryDto } from './dto/checkout-preview-query.dto';
import { InitPaymentDto } from './dto/init-payment.dto';
import { MockSimulateDto } from './dto/mock-simulate.dto';
import { PaymentStatusQueryDto } from './dto/payment-status-query.dto';
import {
  PaymentsCheckoutPreviewDocs,
  PaymentsInitDocs,
  PaymentsMockSimulateDocs,
  PaymentsPendingDocs,
  PaymentsReturnDocs,
  PaymentsStatusDocs,
  PaymentsWebhookDocs,
  PaymentsWebhookPingDocs,
} from './payments.controller.docs';
import { PaymentsService } from './payments.service';

@ApiTags(SWAGGER_TAGS.PAYMENTS)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('checkout-preview')
  @PaymentsCheckoutPreviewDocs()
  @UseGuards(JwtAuthenticatedGuard, ActiveAccountGuard)
  @HttpCode(HttpStatus.OK)
  checkoutPreview(
    @CurrentUser() user: JwtPayload,
    @Query() query: CheckoutPreviewQueryDto,
  ) {
    return this.paymentsService.getCheckoutPreview(user.sub, query.plan_id);
  }

  @Get('pending')
  @PaymentsPendingDocs()
  @UseGuards(JwtAuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  listPending(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.listPendingPayments(user.sub);
  }

  @Get('status')
  @PaymentsStatusDocs()
  @UseGuards(JwtAuthenticatedGuard)
  @HttpCode(HttpStatus.OK)
  getStatus(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaymentStatusQueryDto,
  ) {
    return this.paymentsService.getPaymentStatus(
      user.sub,
      query.transaction_id,
    );
  }

  @Post('init')
  @PaymentsInitDocs()
  @UseGuards(JwtAuthenticatedGuard, ActiveAccountGuard)
  @HttpCode(HttpStatus.OK)
  initPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitPaymentDto,
  ) {
    return this.paymentsService.initPayment(user.sub, dto);
  }

  @Get('webhook')
  @PaymentsWebhookPingDocs()
  @HttpCode(HttpStatus.OK)
  webhookGet(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    res.status(HttpStatus.OK).send();
    const ref = this.extractWebhookRef(query);
    if (ref) {
      this.paymentsService.processPaymentNotification(ref, query);
    }
  }

  @Post('webhook')
  @PaymentsWebhookDocs()
  @HttpCode(HttpStatus.OK)
  webhookPost(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    res.status(HttpStatus.OK).send();
    const merged = { ...query, ...(body as Record<string, unknown>) };
    const ref = this.extractWebhookRef(merged);
    if (ref) {
      this.paymentsService.processPaymentNotification(ref, merged);
    }
  }

  private extractWebhookRef(
    params: Record<string, unknown>,
  ): string | null {
    const keys = [
      'payment_ref',
      'transaction_id',
      'ref_transaction',
      'order_id',
    ];
    for (const key of keys) {
      const val = params[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }
    const paymentId = params.paymentId ?? params.payment_id;
    if (typeof paymentId === 'string' && paymentId.trim()) {
      return `__paymentId:${paymentId.trim()}`;
    }
    return null;
  }

  @Get('return')
  @PaymentsReturnDocs()
  getReturn(@Query('transaction_id') transactionId?: string) {
    return this.paymentsService.getReturnStatus(transactionId);
  }

  @Post('mock/simulate')
  @PaymentsMockSimulateDocs()
  @HttpCode(HttpStatus.OK)
  mockSimulate(@Body() dto: MockSimulateDto) {
    return this.paymentsService.simulateMockPayment(dto);
  }
}
