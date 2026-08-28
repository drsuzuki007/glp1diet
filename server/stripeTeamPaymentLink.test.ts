import { describe, expect, it } from "vitest";

describe("Stripe team payment link", () => {
  it("is a reachable Stripe test-mode checkout link", async () => {
    const paymentLink = process.env.STRIPE_TEAM_PAYMENT_LINK_URL;
    expect(paymentLink).toMatch(/^https:\/\/buy\.stripe\.com\/test_/);

    const response = await fetch(paymentLink!, { redirect: "manual" });
    expect([200, 302, 303]).toContain(response.status);
  });
});
