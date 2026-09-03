import { describe, expect, it } from "vitest";

const key = process.env.STRIPE_RESTRICTED_KEY;
const configured = Boolean(key && !key.includes("placeholder"));

// Hits the live Stripe API; requires real credentials in .dev.vars.
describe.skipIf(!configured)("Stripe restricted key", () => {
  it("can read the Stripe test-mode product catalog", async () => {
    const response = await fetch("https://api.stripe.com/v1/products?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { object?: string; data?: unknown[] };
    expect(payload.object).toBe("list");
    expect(Array.isArray(payload.data)).toBe(true);
  });
});
