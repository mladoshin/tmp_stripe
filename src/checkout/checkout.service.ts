import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingPeriod, Plan } from 'src/enums/config';
import { AccountRepository } from 'src/utils/stripe/account.repository';
import { StripeService } from 'src/utils/stripe/stripe.service';
import Stripe from 'stripe';
import { Connection } from 'typeorm';

@Injectable()
export class CheckoutService {
  private accountRepository: AccountRepository;

  constructor(
    private connection: Connection,
    private readonly stripeService: StripeService,
  ) {
    this.accountRepository =
      this.connection.getCustomRepository<AccountRepository>(AccountRepository);
  }

  async createCheckoutSession(
    contacts: number,
    plan: Plan,
    billingPeriod: BillingPeriod,
    accountName: string,
  ) {
    const prices = (await this.stripeService.getPrices()).data;

    const priceIdsByContacts = prices.filter((p: Stripe.Price) => {
      return p.metadata.limit_subscribers === contacts.toString();
    });

    const filteredByProduct = priceIdsByContacts.filter((p) => {
      return p.nickname.toLowerCase().indexOf(plan) !== -1;
    });

    const priceId = filteredByProduct.find((p: Stripe.Price) => {
      if (billingPeriod === BillingPeriod.MONTHLY) {
        return p.recurring.interval === 'month';
      } else {
        return p.recurring.interval === 'year';
      }
    });

    if (priceId === undefined) {
      throw new BadRequestException(
        'We could not find a plan with this number of contacts.',
      );
    }

    return this.stripeService.createCheckoutSession(priceId.id, accountName);
  }

  async stripeWebhookHandler(event: any) {
    const subscription = await this.stripeService.getSubscription(
      event.data.object.subscription || event.data.object.id,
    );

    const accountName = subscription.metadata.accountName;
    const stripeId = event.data.object.customer;

    switch (event.type) {
      case 'invoice.paid':
        // Integrate with ActiveCampaign (call endpoint to credit accounts)
        break;
      case 'checkout.session.completed':
        // Save stripe customer ID for user in database
        const user = await this.accountRepository.findOne({
          where: {
            AccountName: accountName,
          },
        });

        user.StripeCustomerId = stripeId;

        await this.accountRepository.save(user);
        break;
    }
  }
}
