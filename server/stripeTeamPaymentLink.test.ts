import { describe, expect, it } from "vitest";

const paymentLink = process.env.STRIPE_TEAM_PAYMENT_LINK_URL;
const configured = Boolean(paymentLink && !paymentLink.includes("placeholder"));

// Hits the live Stripe payment link; requires real credentials in .dev.vars.
describe.skipIf(!configured)("Stripe team payment link", () => {
  it("is a reachable Stripe test-mode checkout link", async () => {
    expect(paymentLink).toMatch(/^https:\/\/buy\.stripe\.com\/test_/);

    const response = await fetch(paymentLink!, { redirect: "manual" });
    expect([200, 302, 303]).toContain(response.status);
  });
});
