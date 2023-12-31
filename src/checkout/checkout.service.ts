import { BadRequestException, ConsoleLogger, Injectable } from '@nestjs/common';
import { BillingPeriod, Plan, SubscriptionType } from 'src/enums/config';
import { AccountRepository } from 'src/utils/stripe/account.repository';
import { StripeService } from 'src/utils/stripe/stripe.service';
import { Connection } from 'typeorm';

import axios from 'axios';

const GET_ACCOUNT_LIST =
  'https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/get_account_list';

const UPDATE_ACCOUNT_PLAN =
  'https://internal-services-agencyapiv2.cluster.app-us1.com/api/v1/accounts/account_plan_edit';

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
    checkoutType: SubscriptionType,
    contacts: number,
    plan: Plan,
    billingPeriod: BillingPeriod,
    accountName: string,
  ) {
    // Ensure account name exists
    if (this.accountIds.get(accountName) === undefined) {
      // Search in get_account_list endopint
      const result = await this.getAccountList(accountName);

      result.data.accounts.forEach(({ account_name, account_id }) => {
        this.accountIds.set(account_name, account_id);
      });

      if (this.accountIds.get(accountName) === undefined) {
        throw new BadRequestException(`Account ${accountName} does not exist.`);
      }
    }

    const prices = (
      await this.stripeService.searchPrices(
        checkoutType,
        plan,
        billingPeriod,
        contacts,
      )
    ).data;

    if (prices.length === 0) {
      throw new BadRequestException(
        'We could not find a plan with this number of contacts.',
      );
    }

    return this.stripeService.createCheckoutSession(prices[0].id, accountName);
  }

  async stripeWebhookHandler(event: any) {
    const subscription = await this.stripeService.getSubscription(
      event.data.object.subscription || event.data.object.id,
    );

    const accountName = subscription.metadata.accountName;
    const stripeId = event.data.object.customer;

    switch (event.type) {
      case 'invoice.paid':
        if (this.accountIds.get(accountName) === undefined) {
          const result = await this.getAccountList(accountName);

          result.data.accounts.forEach(({ account_name, account_id }) => {
            this.accountIds.set(account_name, account_id);
          });
        }

        const price = event.data.object.lines.data[0].price;
        const contacts = price.metadata.limit_subscribers;
        const tier = price.metadata.tier;

        let entitlements = [
          {
            code: 'contacts',
            limit: {
              purchased_units: contacts,
            },
          },
        ];

        if (price.metadata.code === SubscriptionType.Sales) {
          entitlements = [
            {
              code: 'user-seats',
              limit: {
                purchased_units: 1,
              },
            },
          ];
        }

        const data = {
          account_id: this.accountIds.get(accountName),
          billing_interval: price.recurring.interval === 'year' ? 12 : 1,
          billing_profile: 'N7HBN4G',
          currency: 'USD',
          products: [
            {
              code: price.metadata.code,
              tier,
              entitlements,
            },
          ],
        };

        try {
          this.logger.debug(
            `Updating plan for ${accountName} to ${tier} ${contacts} contacts`,
          );

          this.logger.debug(data);

          const result = await axios.post(
            `${UPDATE_ACCOUNT_PLAN}/${accountName}`,
            data,
            {
              headers: {
                'api-key': process.env.ACTIVE_CAMPAIGN_API_KEY,
              },
            },
          );

          this.logger.log(result.data);
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

  private async getAccountList(accountName = '') {
    return await axios.get(GET_ACCOUNT_LIST, {
      headers: {
        'api-key': process.env.ACTIVE_CAMPAIGN_API_KEY,
      },
      params: {
        search_account: accountName,
      },
    });
  }
}
