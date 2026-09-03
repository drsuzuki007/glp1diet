import { describe, expect, it } from "vitest";
import { stripe } from "./stripe";
import { constructVerifiedStripeEvent } from "../worker/stripeWebhook";

const webhookSecret = process.env.STRIPE_TEAM_WEBHOOK_SECRET;
const configured = Boolean(webhookSecret && !webhookSecret.includes("placeholder"));

// Requires real Stripe credentials in .dev.vars; skipped on a fresh clone.
describe.skipIf(!configured)("Stripe team webhook secret", () => {
  it("validates a signed Stripe event with the team webhook secret", async () => {
    expect(webhookSecret).toMatch(/^whsec_/);

    const payload = JSON.stringify({
      id: "evt_team_plan_signature_test",
      object: "event",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_team_test" } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret! });
    const event = await constructVerifiedStripeEvent(payload, signature);

    expect(event.id).toBe("evt_team_plan_signature_test");
    expect(event.type).toBe("customer.subscription.updated");
  });
});
