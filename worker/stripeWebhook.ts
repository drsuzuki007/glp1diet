/**
 * POST /api/stripe/webhook
 *
 * Same URL and same behaviour as the Express version; the only change is that
 * signature verification uses Stripe's async/WebCrypto path, because Workers
 * has no synchronous Node crypto.
 *
 * Local testing:  stripe listen --forward-to http://localhost:5173/api/stripe/webhook
 */
import type Stripe from "stripe";
import { ENV } from "../server/_core/env";
import { getStripeClient, handleStripeEvent } from "../server/stripe";

export async function constructVerifiedStripeEvent(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecrets = ENV.stripeWebhookSecrets;
  if (webhookSecrets.length === 0) {
    throw new Error(
      "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET and/or STRIPE_TEAM_WEBHOOK_SECRET."
    );
  }

  const cryptoProvider = (
    stripe.constructor as unknown as { createSubtleCryptoProvider: () => unknown }
  ).createSubtleCryptoProvider();

  let lastError: unknown;
  // The personal-plan and team-plan endpoints have different signing secrets.
  for (const webhookSecret of webhookSecrets) {
    try {
      return await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        webhookSecret,
        undefined,
        cryptoProvider as never
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Stripe webhook signature verification failed");
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = await constructVerifiedStripeEvent(payload, signature);
    await handleStripeEvent(event);
    console.log(`[Webhook] Processed ${event.type} (${event.id})`);
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed";
    console.error("[Webhook] Rejected event:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
