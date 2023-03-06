import { Injectable } from '@nestjs/common';
import { AccountRepository } from 'src/utils/stripe/account.repository';
import { StripeService } from 'src/utils/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly stripeService: StripeService,
  ) {}

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
