import { describe, expect, it } from "vitest";
import { subscriptionCancellationScheduled, subscriptionPeriodEnd } from "./stripe";

function subscriptionFixture(fields: Record<string, unknown>) {
  return {
    status: "active",
    cancel_at_period_end: false,
    items: { data: [] },
    ...fields,
  } as never;
}

describe("Stripe subscription field mapping", () => {
  it("uses the item-level period end returned by the current Stripe API", () => {
    const end = subscriptionPeriodEnd(subscriptionFixture({ items: { data: [{ current_period_end: 1789275288 }] } }));
    expect(end?.getTime()).toBe(1789275288000);
  });

  it("treats cancel_at as a scheduled cancellation when cancel_at_period_end is absent", () => {
    expect(subscriptionCancellationScheduled(subscriptionFixture({ cancel_at: 1789275288 }))).toBe(true);
    expect(subscriptionCancellationScheduled(subscriptionFixture({ cancel_at: null }))).toBe(false);
  });
});
