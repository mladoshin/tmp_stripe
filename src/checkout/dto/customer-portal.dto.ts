import { IsNotEmpty } from 'class-validator';

export class CustomerPortalDto {
  @IsNotEmpty()
  accountName: string;
}
