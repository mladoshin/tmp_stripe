import {
  Body,
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { StripeService } from 'src/utils/stripe/stripe.service';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { CustomerPortalDto } from './dto/customer-portal.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('/create')
  async checkout(@Body() dto: CheckoutDto) {
    return this.checkoutService.createCheckoutSession(
      dto.checkoutType,
      dto.contacts,
      dto.plan,
      dto.billingPeriod,
      dto.accountName,
    );
  }

  @Post('/customer-portal')
  async customerPortal(@Body() dto: CustomerPortalDto) {
    return this.stripeService.createBillingPortalSession(dto.accountName);
  }

  @Post('/stripe')
  async webhook(@Headers('stripe-signature') signature, @Req() request: any) {
    let event;
    try {
      event = await this.stripeService.verifyEventWebhook(
        request.rawBody,
        signature,
      );
    } catch (err) {
      throw new BadRequestException('Invalid signature.');
    }

    return this.checkoutService.stripeWebhookHandler(event);
  }

  @Get('/test')
  async test(@Headers() headers) {
    return { success: true };
  }
}
