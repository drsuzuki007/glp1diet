export type StripeSubscriptionStatus = "active" | "trialing" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused";
export type SubscriptionAccessState = { status: StripeSubscriptionStatus; currentPeriodEnd?: Date | null } | null | undefined;

export function hasSubscriptionAccess(subscription: SubscriptionAccessState) {
  if (subscription?.status !== "active" && subscription?.status !== "trialing") return false;
  return !subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() > Date.now();
}

export function shouldApplyStripeEvent(existingEventCreatedAt: Date | null | undefined, incomingEventCreatedAt: Date) {
  return !existingEventCreatedAt || incomingEventCreatedAt.getTime() >= existingEventCreatedAt.getTime();
}

export function subscriptionAccessState(subscription: SubscriptionAccessState) {
  return { subscribed: hasSubscriptionAccess(subscription) };
}

export function requireSubscriptionAccess(subscription: SubscriptionAccessState) {
  if (!hasSubscriptionAccess(subscription)) {
    throw new Error("サブスクリプションへの加入が必要です。");
  }
}
