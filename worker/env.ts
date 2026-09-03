/**
 * Bindings and variables available to the Worker.
 *
 * Bindings (DB / ASSETS / MEDIA) come from wrangler.jsonc.
 * Plain strings come from wrangler.jsonc `vars` (public) or from
 * `.dev.vars` / `wrangler secret put` (secret).
 *
 * Add a new setting here first — `getEnv()` in worker/runtime.ts is the single
 * way the rest of the code reads configuration.
 */
export interface AppEnv {
  /** Cloudflare D1 database. Replaces the old MySQL `DATABASE_URL`. */
  DB: D1Database;
  /** Built React client, served by the Worker. */
  ASSETS: Fetcher;
  /** R2 bucket backing `/manus-storage/*`. Optional so dev works without it. */
  MEDIA?: R2Bucket;

  /** Canonical site origin, used for absolute URLs when the request has no Host. */
  APP_ORIGIN?: string;
  VITE_APP_TITLE?: string;

  /** HS256 key for the session cookie JWT. */
  JWT_SECRET?: string;

  /** Google OAuth 2.0 client credentials. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  /** `openId` of the site owner; that account is promoted to `admin`. */
  OWNER_OPEN_ID?: string;
  /** Email of the site owner. Simpler than OWNER_OPEN_ID — either one works. */
  OWNER_EMAIL?: string;

  /** Vimeo. 非公開動画のメタデータ取得と、埋め込みドメイン制限の操作に使う。 */
  VIMEO_ACCESS_TOKEN?: string;
  /**
   * 埋め込みを許可するドメイン（カンマ区切り）。例: "glp1.diet,www.glp1.diet"
   * 空のあいだは Vimeo 側の設定を一切変更しない（localhost / workers.dev でも再生可）。
   * glp1.diet への切り替えと同時に設定する。
   */
  VIMEO_EMBED_DOMAINS?: string;

  /** Stripe. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_RESTRICTED_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_TEAM_WEBHOOK_SECRET?: string;
  STRIPE_TEAM_PAYMENT_LINK_URL?: string;
  STRIPE_PRICE_ID?: string;
}
