import { IsEnum, IsNotEmpty } from 'class-validator';
import { BillingPeriod, Plan, SubscriptionType } from 'src/enums/config';

export class CheckoutDto {
  @IsNotEmpty()
  contacts: number;

  @IsNotEmpty()
  @IsEnum(Plan)
  plan: Plan;

  @IsNotEmpty()
  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;

  @IsNotEmpty()
  accountName: string;

  @IsNotEmpty()
  @IsEnum(SubscriptionType)
  checkoutType: SubscriptionType;
}
