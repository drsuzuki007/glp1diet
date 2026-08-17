import Stripe from "stripe";
import { GLP1_MONTHLY_SUBSCRIPTION } from "./products";
import { getSubscriptionStatus, getUserById, getUserByStripeCustomerId, setStripeCustomerId, syncStripeSubscription } from "./db";
import type { StripeSubscriptionStatus } from "../shared/subscription";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is required for Stripe billing.");

export const stripe = new Stripe(stripeSecretKey);

function originFromRequest(origin: string | undefined) {
  if (!origin) throw new Error("決済ページの送信元を確認できませんでした。再度お試しください。");
  return origin;
}

function stripeId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEnd = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}

export function subscriptionCancellationScheduled(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as { cancel_at_period_end?: boolean; cancel_at?: number | null };
  return Boolean(raw.cancel_at_period_end || raw.cancel_at);
}

function toLocalStatus(status: Stripe.Subscription.Status): StripeSubscriptionStatus {
  return status as StripeSubscriptionStatus;
}

async function ensureStripeCustomer(userId: number) {
  const user = await getUserById(userId);
  if (!user) throw new Error("ユーザー情報を確認できませんでした。");
  if (user.stripeCustomerId) return { user, customerId: user.stripeCustomerId };
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { user_id: user.id.toString(), open_id: user.openId },
  });
  await setStripeCustomerId(user.id, customer.id);
  return { user, customerId: customer.id };
}

export async function createSubscriptionCheckout(input: { userId: number; origin?: string }) {
  const existing = await getSubscriptionStatus(input.userId);
  if (existing.subscribed) return { alreadySubscribed: true as const, url: null };
  const origin = originFromRequest(input.origin);
  const { user, customerId } = await ensureStripeCustomer(input.userId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id.toString(),
    metadata: { user_id: user.id.toString(), plan: "standard", customer_email: user.email ?? "", customer_name: user.name ?? "" },
    subscription_data: { metadata: { user_id: user.id.toString(), plan: "standard", customer_email: user.email ?? "", customer_name: user.name ?? "" } },
    line_items: [{
      price_data: {
        currency: GLP1_MONTHLY_SUBSCRIPTION.currency,
        product_data: { name: GLP1_MONTHLY_SUBSCRIPTION.name, description: GLP1_MONTHLY_SUBSCRIPTION.description },
        recurring: { interval: GLP1_MONTHLY_SUBSCRIPTION.interval },
        unit_amount: GLP1_MONTHLY_SUBSCRIPTION.amount,
      },
      quantity: 1,
    }],
    allow_promotion_codes: true,
    success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe CheckoutのURLを作成できませんでした。");
  return { alreadySubscribed: false as const, url: session.url };
}

export async function createBillingPortal(input: { userId: number; origin?: string }) {
  const origin = originFromRequest(input.origin);
  const { customerId } = await ensureStripeCustomer(input.userId);
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/account/subscription?billing=updated` });
  return { url: session.url };
}

export async function scheduleStripeSubscriptionCancellation(input: { userId: number }) {
  const localStatus = await getSubscriptionStatus(input.userId);
  const subscriptionId = localStatus.subscription?.stripeSubscriptionId;
  if (!subscriptionId) throw new Error("解約対象の契約が見つかりません。");
  const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  await syncSubscriptionFromStripe(updated);
  return getSubscriptionStatus(input.userId);
}

export async function getStripeBillingSummary(input: { userId: number }) {
  const [user, localStatus] = await Promise.all([getUserById(input.userId), getSubscriptionStatus(input.userId)]);
  const plan = localStatus.subscribed ? "standard" as const : "free" as const;
  if (!user?.stripeCustomerId) return { ...localStatus, plan, cardLast4: null, cardBrand: null, invoices: [] };

  const [customer, invoiceList] = await Promise.all([
    stripe.customers.retrieve(user.stripeCustomerId),
    stripe.invoices.list({ customer: user.stripeCustomerId, limit: 12 }),
  ]);
  const paymentMethodId = !customer.deleted ? customer.invoice_settings.default_payment_method : null;
  const paymentMethod = paymentMethodId
    ? await stripe.paymentMethods.retrieve(typeof paymentMethodId === "string" ? paymentMethodId : paymentMethodId.id)
    : null;
  const card = paymentMethod?.card;
  return {
    ...localStatus,
    plan,
    cardLast4: card?.last4 ?? null,
    cardBrand: card?.brand ?? null,
    invoices: invoiceList.data.map(invoice => ({
      id: invoice.id,
      createdAt: new Date(invoice.created * 1000),
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    })),
  };
}

async function userIdForSubscription(subscription: Stripe.Subscription) {
  const fromMetadata = Number(subscription.metadata.user_id);
  if (Number.isInteger(fromMetadata) && fromMetadata > 0) return fromMetadata;
  const customerId = stripeId(subscription.customer);
  if (!customerId) return null;
  const user = await getUserByStripeCustomerId(customerId);
  return user?.id ?? null;
}

export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription, stripeEventCreatedAt = new Date()) {
  const userId = await userIdForSubscription(subscription);
  if (!userId) return;
  const customerId = stripeId(subscription.customer);
  if (customerId) await setStripeCustomerId(userId, customerId);
  await syncStripeSubscription({
    userId,
    stripeSubscriptionId: subscription.id,
    status: toLocalStatus(subscription.status),
    currentPeriodEnd: subscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: subscriptionCancellationScheduled(subscription),
    stripeEventCreatedAt,
  });
}

export async function refreshStripeSubscription(userId: number) {
  const localStatus = await getSubscriptionStatus(userId);
  const subscriptionId = localStatus.subscription?.stripeSubscriptionId;
  if (!subscriptionId) return localStatus;
  await syncSubscriptionFromStripe(await stripe.subscriptions.retrieve(subscriptionId));
  return getSubscriptionStatus(userId);
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type.startsWith("customer.subscription.")) {
    await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription, new Date(event.created * 1000));
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.client_reference_id ?? session.metadata?.user_id);
    const customerId = stripeId(session.customer);
    if (Number.isInteger(userId) && userId > 0 && customerId) await setStripeCustomerId(userId, customerId);
    const subscriptionId = stripeId(session.subscription);
    if (subscriptionId) await syncSubscriptionFromStripe(await stripe.subscriptions.retrieve(subscriptionId), new Date(event.created * 1000));
    return;
  }
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const raw = invoice as unknown as { subscription?: string | Stripe.Subscription | null };
    const subscriptionId = stripeId(raw.subscription ?? null);
    if (subscriptionId) await syncSubscriptionFromStripe(await stripe.subscriptions.retrieve(subscriptionId), new Date(event.created * 1000));
    return;
  }
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const raw = invoice as unknown as { subscription?: string | Stripe.Subscription | null };
    const subscriptionId = stripeId(raw.subscription ?? null);
    if (subscriptionId) await syncSubscriptionFromStripe(await stripe.subscriptions.retrieve(subscriptionId), new Date(event.created * 1000));
  }
}
