import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountRepository } from './stripe/account.repository';
import { Account } from './stripe/entities/account.entity';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  providers: [StripeService, AccountRepository],
  exports: [AccountRepository],
})
export class UtilsModule {}
