// Generate Stripe products and plans

const { default: Stripe } = require("stripe");

const stripe = new Stripe('sk_test_51MeHlcIkm8gKJ86Oi8iNQ2ApKIxUJKNchQMWvXR4XkA3HHTRrIz1N5KjHHTcmHv8qDEtLB8rSOaCqmmmhAhHjait006IJhPbcO');

const products = [
  {
    name: "Lite",
    description: "A plan for small businesses",
  },
  {
    name: "Plus",
    description: "A plan for medium-sized businesses",
  },
  {
    name: "Professional",
    description: "A plan for large businesses",
  },
  {
    name: "Enterprise",
    description: "A custom plan for enterprise-level businesses",
  },
];

class Plan {
  constructor(limitSub, limitMail, monthlyPrice, yearlyPrice, currency = 'USD') {
    this.limitSub = limitSub * 1000; // Metadata on plan
    this.limitMail = limitMail; // Metadata on plan
    this.monthlyPrice = monthlyPrice;
    this.yearlyPrice = yearlyPrice;
  }
};

const plans = {
  'Lite': [
    new Plan(0.5, null, 15, 108),
    new Plan(1, null, 39, 348),
    new Plan(2.5, null, 61, 588),
    new Plan(5, null, 99, 948),
    new Plan(10, null, 174, 1668),
    new Plan(25, null, 286, 2748),
    new Plan(50, null, 486, 4668),
    new Plan(75, null, 611, 5868),
    new Plan(100, null, 724, 6948),
  ],
  'Plus': [
    new Plan(1, null, 70, 588),
    new Plan(2.5, null, 125, 1188),
    new Plan(5, null, 186, 1788),
    new Plan(10, null, 287, 2748),
    new Plan(25, null, 474, 4548),
    new Plan(50, null, 699, 6708),
    new Plan(75, null, 911, 8748),
    new Plan(100, null, 1099, 10548),
  ],
  'Professional': [
    new Plan(2.5, null, 187, 1788),
    new Plan(5, null, 262, 2508),
    new Plan(10, null, 424, 4068),
    new Plan(25, null, 686, 6588),
    new Plan(50, null, 1011, 9708),
    new Plan(75, null, 1324, 12708),
    new Plan(100, null, 1599, 15348),
  ],
  'Enterprise': [
    new Plan(2.5, null, 323, 3108),
    new Plan(5, null, 474, 4548),
    new Plan(10, null, 674, 6468),
    new Plan(25, null, 999, 9588),
    new Plan(50, null, 1323, 12708),
    new Plan(75, null, 1649, 15828),
    new Plan(100, null, 1974, 18948),
  ],
};

(async () => {
  const prices = {
    'Lite': [],
    'Plus': [],
    'Professional': [],
    'Enterprise': [],
  };

  for(const product in plans) {
    console.log(product);
    plans[product].forEach((plan) => {
      prices[product].push({
        nickname: product + " Monthly",
        interval: "month",
        currency: "USD",
        amount: plan.monthlyPrice * 100,
        product: { 
          name: product 
        },
        usage_type: "licensed",
        metadata: {
          limit_subscribers: plan.limitSub,
        },
      });

      prices[product].push({
        nickname: product + " Yearly",
        interval: "year",
        currency: "USD",
        amount: plan.yearlyPrice * 100,
        product: { 
          name: product 
        },
        usage_type: "licensed",
        metadata: {
          limit_subscribers: plan.limitSub,
        },
      });
    })
  }

  console.log(JSON.stringify(prices, null, 2));

  for (const [product, planArray] of Object.entries(prices)) {
    for (const plan of planArray) {
      await stripe.plans.create({
        nickname: plan.nickname,
        interval: plan.interval,
        currency: plan.currency,
        amount: plan.amount,
        product: plan.product,
        usage_type: plan.usage_type,
        metadata: plan.metadata,
      });

      console.log('Created', plan.nickname, plan.interval, plan.metadata.limit_subscribers);
    }
  }
})();