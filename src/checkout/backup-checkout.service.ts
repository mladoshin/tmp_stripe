import { BadRequestException, ConsoleLogger, Injectable } from '@nestjs/common';
import { BillingPeriod, Plan } from 'src/enums/config';
import { AccountRepository } from 'src/utils/stripe/account.repository';
import { StripeService } from 'src/utils/stripe/stripe.service';
import Stripe from 'stripe';
import { Connection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Console } from 'console';

const GET_ACCOUNT_LIST =
  'https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/get_account_list';

// const UPDATE_ACCOUNT_PLAN =
// 'https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/account_plan_edit/proteatwotrial.activehosted.com';

@Injectable()
export class CheckoutService {
  private accountRepository: AccountRepository;
  private logger: ConsoleLogger;
  private accountIds: Map<string, number>;

  constructor(
    private connection: Connection,
    private readonly stripeService: StripeService,
  ) {
    this.logger = new ConsoleLogger();

    this.accountRepository =
      this.connection.getCustomRepository<AccountRepository>(AccountRepository);

    this.accountIds = new Map<string, number>();
  }

  async createCheckoutSession(
    contacts: number,
    plan: Plan,
    billingPeriod: BillingPeriod,
    accountName: string,
  ) {
    // Ensure account name exists
    if (this.accountIds.get(accountName) === undefined) {
      // Search in get_account_list endopint
      const result = await axios.get(GET_ACCOUNT_LIST, {
        headers: {
          'api-key': process.env.ACTIVE_CAMPAIGN_API_KEY,
        },
      });

      result.data.accounts.forEach(({ account_name, account_id }) => {
        this.accountIds.set(account_name, account_id);
      });

      if (this.accountIds.get(accountName) === undefined) {
        throw new BadRequestException(`Account ${accountName} does not exist.`);
      }
    }

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

    const filePath = path.join(process.cwd(), 'webhook.json');
    fs.writeFileSync(filePath, JSON.stringify(subscription));
    fs.writeFileSync(filePath, JSON.stringify({ message: 'Hello Test' }));

    const accountName = subscription.metadata.accountName;
    const stripeId = event.data.object.customer;

    switch (event.type) {
      case 'invoice.paid':
        if (this.accountIds.get(accountName) === undefined) {
          const result = await axios.get(GET_ACCOUNT_LIST, {
            headers: {
              'api-key': process.env.ACTIVE_CAMPAIGN_API_KEY,
            },
          });

          result.data.accounts.forEach(({ account_name, account_id }) => {
            this.accountIds.set(account_name, account_id);
          });
        }

        const tier =
          event.data.object.lines.data[0].plan.nickname.split(' ')[0].toLowerCase();
        const contacts =
          event.data.object.lines.data[0].plan.metadata.limit_subscribers;

        const data = {
          currency: 'USD',
          billing_interval: 1,
          products: [
            {
              code: 'marketing',
              tier,
              entitlements: [
                {
                  code: 'contacts',
                  limit: {
                    purchased_units: contacts,
                  },
                },
              ],
            },
          ],
          account_id: this.accountIds.get(accountName),
          billing_profile: 'N7HBN4G',
        };

        try {
          this.logger.debug(
            `Updating plan for ${accountName} to ${tier} ${contacts} contacts`,
          );

          const filePath = path.join(process.cwd(), 'data.json');
          fs.writeFileSync(filePath, JSON.stringify(data));

          const url =
            'https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/account_plan_edit/' +
            accountName;

          const result = await axios.post(url, data, {
            headers: {
              'api-key': process.env.ACTIVE_CAMPAIGN_API_KEY,
            },
          });

          // this.logger.log(result.data);
          const filePathResult = path.join(process.cwd(), 'result.json');
          fs.writeFileSync(filePathResult, JSON.stringify(result.data));
        } catch (e) {
          this.logger.error(e);
        }

        // Integrate with ActiveCampaign (call endpoint to credit accounts)
        // https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/account_plan_edit/proteatwotrial.activehosted.com
        //   {
        //     "currency": "USD",
        //     "billing_interval": 1,
        //     "products": [{
        //         "code": "em",
        //         "tier": "lite",
        //         "entitlements": [{
        //             "code": "contacts",
        //             "limit": {
        //                 "purchased_units": 1000
        //             }
        //         }]
        //     }]
        // }

        // {
        //     "code": "sms",
        //     "tier": "basic",
        //     "entitlements": [
        //         {
        //             "code": "sms-credits",
        //             "limit": {
        //                 "purchased_units": 1
        //             }
        //         },
        //         {
        //             "code": "sms",
        //             "limit": {
        //                 "purchased_units": 1
        //             }
        //         }
        //     ]
        // }
        break;
      case 'checkout.session.completed':
        // Save stripe customer ID for user in database
        await this.accountRepository.upsert(
          {
            AccountName: accountName,
            StripeCustomerId: stripeId,
          },
          ['AccountName'],
        );
        break;
    }
  }
}
