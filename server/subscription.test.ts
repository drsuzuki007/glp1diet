import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_PRICE_YEN } from "./db";
import { courseFilterSchema } from "./routers";
import { hasSubscriptionAccess, requireSubscriptionAccess, shouldApplyStripeEvent, subscriptionAccessState } from "../shared/subscription";

describe("subscription migration", () => {
  it("uses one monthly all-access price of 980 yen", () => {
    expect(SUBSCRIPTION_PRICE_YEN).toBe(980);
  });

  it("does not accept the retired single-course price filter", () => {
    const parsed = courseFilterSchema.parse({ price: "under1500", sort: "newest" });
    expect(parsed).not.toHaveProperty("price");
  });

  it("grants course playback only to an active subscription", () => {
    expect(hasSubscriptionAccess({ status: "active" })).toBe(true);
    expect(hasSubscriptionAccess({ status: "trialing" })).toBe(true);
    expect(hasSubscriptionAccess({ status: "canceled" })).toBe(false);
    expect(hasSubscriptionAccess(null)).toBe(false);
  });

  it("stops access once the stored paid period has ended", () => {
    expect(hasSubscriptionAccess({ status: "active", currentPeriodEnd: new Date(Date.now() - 1_000) })).toBe(false);
    expect(hasSubscriptionAccess({ status: "active", currentPeriodEnd: new Date(Date.now() + 1_000) })).toBe(true);
  });

  it("does not apply a stale Stripe event over a newer subscription state", () => {
    const latest = new Date("2026-08-13T05:30:05.000Z");
    expect(shouldApplyStripeEvent(latest, new Date("2026-08-13T05:30:04.000Z"))).toBe(false);
    expect(shouldApplyStripeEvent(latest, new Date("2026-08-13T05:30:06.000Z"))).toBe(true);
  });

  it("returns the subscribed field used by course actions and the member library", () => {
    expect(subscriptionAccessState({ status: "active" })).toEqual({ subscribed: true });
    expect(subscriptionAccessState(null)).toEqual({ subscribed: false });
  });

  it("rejects progress saving without an active subscription", () => {
    expect(() => requireSubscriptionAccess(null)).toThrow("サブスクリプションへの加入が必要です。");
    expect(() => requireSubscriptionAccess({ status: "canceled" })).toThrow("サブスクリプションへの加入が必要です。");
    expect(() => requireSubscriptionAccess({ status: "active" })).not.toThrow();
  });
});
