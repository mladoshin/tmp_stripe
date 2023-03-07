import { BadRequestException, Injectable } from '@nestjs/common';
import { BillingPeriod, Plan } from 'src/enums/config';
import { AccountRepository } from 'src/utils/stripe/account.repository';
import { StripeService } from 'src/utils/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly stripeService: StripeService,
  ) {}

  async createCheckoutSession(
    contacts: number,
    plan: Plan,
    billingPeriod: BillingPeriod,
    accountName: string,
  ) {
    const priceIdsByContacts = (
      await this.stripeService.getPricesByProduct(plan)
    ).data.filter((p: Stripe.Price) => {
      return p.metadata.contacts === contacts.toString();
    });

    const priceId = priceIdsByContacts.find((p: Stripe.Price) => {
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
            accountName,
          },
        });

        user.stripeCustomerId = stripeId;

        await this.accountRepository.save(user);
        break;
    }
  }
}
