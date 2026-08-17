import { describe, expect, it } from "vitest";
import { GLP1_MONTHLY_SUBSCRIPTION } from "./products";

describe("GLP1 monthly Stripe product", () => {
  it("defines the ¥980 monthly JPY subscription used for Checkout", () => {
    expect(GLP1_MONTHLY_SUBSCRIPTION).toMatchObject({
      amount: 980,
      currency: "jpy",
      interval: "month",
      name: "MediVista STANDARD",
    });
  });
});
