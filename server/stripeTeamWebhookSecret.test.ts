import { describe, expect, it } from "vitest";
import { stripe } from "./stripe";
import { constructVerifiedStripeEvent } from "./stripeWebhook";

describe("Stripe team webhook secret", () => {
  it("validates a signed Stripe event with the team webhook secret", () => {
    const webhookSecret = process.env.STRIPE_TEAM_WEBHOOK_SECRET;
    expect(webhookSecret).toMatch(/^whsec_/);

    const payload = JSON.stringify({
      id: "evt_team_plan_signature_test",
      object: "event",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_team_test" } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret! });
    const event = constructVerifiedStripeEvent(Buffer.from(payload), signature);

    expect(event.id).toBe("evt_team_plan_signature_test");
    expect(event.type).toBe("customer.subscription.updated");
  });
});
