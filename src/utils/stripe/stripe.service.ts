import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { AccountRepository } from './account.repository';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private readonly accountRepository: AccountRepository) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15',
    });
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
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://magmabots.com',
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

    // Create customer portal session
    const result = await this.stripe.billingPortal.sessions.create({
      customer,
      return_url:
        process.env.MAGMA_PORTAL_RETURN_URL || 'https://magmabots.com',
    });

    return {
      url: result.url,
    };
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
}
