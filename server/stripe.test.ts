import { describe, expect, it } from "vitest";
import { isTeamSubscription, subscriptionCancellationScheduled, subscriptionPeriodEnd, subscriptionSeatCount } from "./stripe";
import { GLP1_MONTHLY_SUBSCRIPTION } from "./products";

function subscriptionFixture(fields: Record<string, unknown>) {
  return {
    status: "active",
    cancel_at_period_end: false,
    items: { data: [] },
    ...fields,
  } as never;
}

describe("Stripe subscription field mapping", () => {
  it("defines the STANDARD plan as a 980-yen monthly subscription", () => {
    expect(GLP1_MONTHLY_SUBSCRIPTION).toMatchObject({
      name: "MediVista STANDARD",
      amount: 980,
      currency: "jpy",
      interval: "month",
    });
  });

  it("uses the item-level period end returned by the current Stripe API", () => {
    const end = subscriptionPeriodEnd(subscriptionFixture({ items: { data: [{ current_period_end: 1789275288 }] } }));
    expect(end?.getTime()).toBe(1789275288000);
  });

  it("treats cancel_at as a scheduled cancellation when cancel_at_period_end is absent", () => {
    expect(subscriptionCancellationScheduled(subscriptionFixture({ cancel_at: 1789275288 }))).toBe(true);
    expect(subscriptionCancellationScheduled(subscriptionFixture({ cancel_at: null }))).toBe(false);
  });

  it("identifies team subscriptions from Payment Link metadata and normalizes their seat count", () => {
    expect(isTeamSubscription(subscriptionFixture({ metadata: { billing_plan: "team" } }))).toBe(true);
    expect(isTeamSubscription(subscriptionFixture({ metadata: { billing_plan: "standard" } }))).toBe(false);
    expect(subscriptionSeatCount(subscriptionFixture({ items: { data: [{ quantity: 50 }] } }))).toBe(50);
    expect(subscriptionSeatCount(subscriptionFixture({ items: { data: [{ quantity: 5000 }] } }))).toBe(999);
  });
});
