export type SubscriptionAccessState = { status: "active" | "cancelled" } | null | undefined;

export function hasSubscriptionAccess(subscription: SubscriptionAccessState) {
  return subscription?.status === "active";
}

export function subscriptionAccessState(subscription: SubscriptionAccessState) {
  return { subscribed: hasSubscriptionAccess(subscription) };
}

export function requireSubscriptionAccess(subscription: SubscriptionAccessState) {
  if (!hasSubscriptionAccess(subscription)) {
    throw new Error("サブスクリプションへの加入が必要です。");
  }
}
