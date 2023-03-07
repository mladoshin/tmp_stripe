import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'Account' })
export class Account {
  @PrimaryColumn()
  AccountName: string;

  @Column()
  StripeCustomerId: string;
}
