import { BadRequestException, Injectable } from '@nestjs/common';
import { Plan } from 'src/enums/config';
import Stripe from 'stripe';
import { Connection } from 'typeorm';
import { AccountRepository } from './account.repository';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private accountRepository: AccountRepository;

  constructor(private connection: Connection) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
    this.accountRepository =
      this.connection.getCustomRepository<AccountRepository>(AccountRepository);
  }

  /**
   * Create checkout session and return URL.
   * @param priceId ID of price in Stripe
   * @param accountName domain from which the user is making the request
   * @returns
   */
  async createCheckoutSession(priceId: string, accountName: string) {
    const result = await this.stripe.checkout.sessions.create({
      success_url: `https://${accountName}`,
      cancel_url: `https://${accountName}`,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          accountName,
        },
      },
    });

    return {
      url: result.url,
    };
  }

  async getPrices() {
    return this.stripe.prices.list({
      limit: 100,
    });
  }

  /**
   * Ensure signature for Stripe webhook is valid, throw exception otherwise
   * @param rawBody
   * @param signature
   * @returns
   */
  async verifyEventWebhook(rawBody: string, signature: string) {
    let event;
    try {
      event = await this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_KEY,
      );
    } catch (err) {
      throw new Error('Invalid signature.');
    }

    return event;
  }

  async createBillingPortalSession(customer: string) {
    // Retrieve customer ID from database
    const account = await this.accountRepository.findOne({
      where: {
        AccountName: customer,
      },
    });

    if (account === undefined) {
      throw new BadRequestException('Could not find account ' + customer);
    }

    // Create customer portal session
    const result = await this.stripe.billingPortal.sessions.create({
      customer: account.StripeCustomerId,
      return_url: `https://${customer}`,
    });

    return {
      url: result.url,
    };
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
}
