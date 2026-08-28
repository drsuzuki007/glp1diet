import express, { type Express, type Request, type Response } from "express";
import { handleStripeEvent, stripe } from "./stripe";

export function constructVerifiedStripeEvent(payload: Buffer, signature: string) {
  const webhookSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_TEAM_WEBHOOK_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  let lastError: unknown;

  for (const webhookSecret of webhookSecrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Stripe webhook is not configured");
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") return res.status(400).json({ error: "Missing Stripe signature" });
    try {
      const event = constructVerifiedStripeEvent(req.body, signature);
      await handleStripeEvent(event);
      console.log(`[Webhook] Processed ${event.type} (${event.id})`);
      return res.json({ received: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Webhook handling failed";
      console.error("[Webhook] Rejected event:", message);
      return res.status(400).json({ error: message });
    }
  });
}
