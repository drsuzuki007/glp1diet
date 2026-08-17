import express, { type Express, type Request, type Response } from "express";
import { handleStripeEvent, stripe } from "./stripe";

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") return res.status(400).json({ error: "Missing Stripe signature" });
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: "Stripe webhook is not configured" });
    try {
      const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
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
