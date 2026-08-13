import Stripe from "stripe";

const subscriptionId = process.argv[2];
if (!subscriptionId) throw new Error("Usage: node scripts/inspect-stripe-subscription.mjs <subscription-id>");
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not available");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
console.log(JSON.stringify({
  id: subscription.id,
  status: subscription.status,
  cancelAtPeriodEnd: subscription.cancel_at_period_end,
  currentPeriodEnd: subscription.current_period_end,
  cancelAt: subscription.cancel_at,
  canceledAt: subscription.canceled_at,
  items: subscription.items.data.map(item => ({ id: item.id, currentPeriodEnd: item.current_period_end, currentPeriodStart: item.current_period_start })),
}, null, 2));
