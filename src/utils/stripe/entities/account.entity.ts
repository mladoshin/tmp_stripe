import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Account {
  @PrimaryColumn()
  accountName: string;

  @Column()
  stripeCustomerId: string;
}
