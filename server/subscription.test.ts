import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_PRICE_YEN } from "./db";
import { courseFilterSchema } from "./routers";
import { hasSubscriptionAccess, requireSubscriptionAccess, subscriptionAccessState } from "../shared/subscription";

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
    expect(hasSubscriptionAccess({ status: "cancelled" })).toBe(false);
    expect(hasSubscriptionAccess(null)).toBe(false);
  });

  it("returns the subscribed field used by course actions and the member library", () => {
    expect(subscriptionAccessState({ status: "active" })).toEqual({ subscribed: true });
    expect(subscriptionAccessState(null)).toEqual({ subscribed: false });
  });

  it("rejects progress saving without an active subscription", () => {
    expect(() => requireSubscriptionAccess(null)).toThrow("サブスクリプションへの加入が必要です。");
    expect(() => requireSubscriptionAccess({ status: "cancelled" })).toThrow("サブスクリプションへの加入が必要です。");
    expect(() => requireSubscriptionAccess({ status: "active" })).not.toThrow();
  });
});
