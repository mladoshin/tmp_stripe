import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Account {
  @PrimaryColumn()
  AccountName: string;

  @Column()
  StripeCustomerId: string;
}
