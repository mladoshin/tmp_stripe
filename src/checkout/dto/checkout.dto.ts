import { IsNotEmpty } from 'class-validator';

export class CheckoutDto {
  @IsNotEmpty()
  priceId: string;

  @IsNotEmpty()
  accountName: string;
}
