import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { UtilsModule } from 'src/utils/utils.module';
import { StripeService } from 'src/utils/stripe/stripe.service';
import { AccountRepository } from 'src/utils/stripe/account.repository';

@Module({
  controllers: [CheckoutController],
  imports: [UtilsModule],
  providers: [CheckoutService, StripeService, AccountRepository, StripeService],
})
export class CheckoutModule {}
