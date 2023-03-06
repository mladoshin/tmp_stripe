import { Module } from '@nestjs/common';
import { AccountRepository } from './stripe/account.repository';
import { StripeService } from './stripe/stripe.service';

@Module({
  providers: [StripeService, AccountRepository],
  exports: [AccountRepository],
})
export class UtilsModule {}
