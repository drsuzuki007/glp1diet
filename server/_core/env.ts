/**
 * Typed configuration accessors.
 *
 * Every value is a getter so it is read from the *current request's* bindings
 * (see worker/runtime.ts). Do not destructure `ENV` at module scope — capture
 * values inside the function that needs them.
 */
import { getEnv } from "../../worker/runtime";

/** Stable audience claim for session tokens. Kept for cookie compatibility. */
export const APP_ID = "glp1.diet";

export const ENV = {
  get appId(): string {
    return APP_ID;
  },
  get cookieSecret(): string {
    return getEnv().JWT_SECRET ?? "";
  },
  get googleClientId(): string {
    return getEnv().GOOGLE_CLIENT_ID ?? "";
  },
  get googleClientSecret(): string {
    return getEnv().GOOGLE_CLIENT_SECRET ?? "";
  },
  get ownerOpenId(): string {
    return getEnv().OWNER_OPEN_ID ?? "";
  },
  /** Easier alternative to OWNER_OPEN_ID: promote whoever signs in with this email. */
  get ownerEmail(): string {
    return getEnv().OWNER_EMAIL ?? "";
  },
  get appOrigin(): string {
    return getEnv().APP_ORIGIN ?? "";
  },
  get vimeoAccessToken(): string {
    return getEnv().VIMEO_ACCESS_TOKEN ?? "";
  },
  get vimeoEmbedDomains(): string {
    return getEnv().VIMEO_EMBED_DOMAINS ?? "";
  },
  get stripeSecretKey(): string {
    return getEnv().STRIPE_SECRET_KEY ?? "";
  },
  get stripeWebhookSecrets(): string[] {
    const env = getEnv();
    return [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_TEAM_WEBHOOK_SECRET].filter(
      (secret): secret is string => Boolean(secret)
    );
  },
  get stripeTeamPaymentLinkUrl(): string | null {
    return getEnv().STRIPE_TEAM_PAYMENT_LINK_URL ?? null;
  },
};
