// Generate Stripe products and plans

const { default: Stripe } = require("stripe");

const stripe = new Stripe('sk_test_51MeHlcIkm8gKJ86Oi8iNQ2ApKIxUJKNchQMWvXR4XkA3HHTRrIz1N5KjHHTcmHv8qDEtLB8rSOaCqmmmhAhHjait006IJhPbcO');

(async () => {
  console.log(JSON.stringify(await stripe.prices.list(), null, 2));
})();