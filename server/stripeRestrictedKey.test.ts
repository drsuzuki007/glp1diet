import { describe, expect, it } from "vitest";

describe("Stripe restricted key", () => {
  it("can read the Stripe test-mode product catalog", async () => {
    const key = process.env.STRIPE_RESTRICTED_KEY;
    expect(key).toBeTruthy();

    const response = await fetch("https://api.stripe.com/v1/products?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { object?: string; data?: unknown[] };
    expect(payload.object).toBe("list");
    expect(Array.isArray(payload.data)).toBe(true);
  });
});
