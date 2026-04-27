import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing/subscriptions')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: unknown,
    @Headers('paddle-signature') signature?: string,
  ) {
    const rawBody = JSON.stringify(body);
    return this.billingService.handlePaddleWebhook(rawBody, signature);
  }
}
