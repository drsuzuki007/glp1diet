/**
 * Per-request runtime context.
 *
 * On Cloudflare Workers there is no `process.env` and no long-lived singleton
 * connection: bindings arrive as an argument to `fetch()`. Rather than thread an
 * `env` parameter through every function in `server/`, the Worker stores the
 * request's bindings in an AsyncLocalStorage for the duration of the request,
 * and `getEnv()` / `getDb()` read from there.
 *
 * Outside a request (Vitest, drizzle-kit, scripts) `getEnv()` falls back to
 * `process.env`, so unit tests and configuration-guard tests keep working.
 *
 * Requires the `nodejs_compat` compatibility flag (set in wrangler.jsonc).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../drizzle/schema";
import type { AppEnv } from "./env";
import {
  createExpressResponse,
  toExpressRequest,
  type ExpressLikeRequest,
  type ExpressLikeResponse,
} from "./http";

export type Database = DrizzleD1Database<typeof schema>;

export type RequestContext = {
  env: AppEnv;
  ctx: ExecutionContext;
  request: Request;
  /** Response headers accumulated during the request (cookies live here). */
  resHeaders: Headers;
  req: ExpressLikeRequest;
  res: ExpressLikeResponse;
  /** Lazily created drizzle instance, one per request. */
  db: Database | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(
  request: Request,
  env: AppEnv,
  ctx: ExecutionContext,
  resHeaders: Headers = new Headers()
): RequestContext {
  return {
    env,
    ctx,
    request,
    resHeaders,
    req: toExpressRequest(request),
    res: createExpressResponse(resHeaders),
    db: null,
  };
}

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function tryGetRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestContext(): RequestContext {
  const store = storage.getStore();
  if (!store) {
    throw new Error(
      "No request context. This code must run inside the Worker's fetch handler."
    );
  }
  return store;
}

/**
 * Configuration for the current request.
 *
 * Falls back to `process.env` when there is no request (tests, CLI scripts), so
 * the same `ENV.*` accessors work in both places.
 */
export function getEnv(): AppEnv {
  const store = storage.getStore();
  if (store) return store.env;
  return (globalThis as { process?: { env?: Record<string, string> } }).process?.env as unknown as AppEnv ?? ({} as AppEnv);
}

/** The drizzle handle bound to this request's D1 database, or null outside a request. */
export function getRequestDb(): Database | null {
  const store = storage.getStore();
  if (!store) return null;
  if (!store.env.DB) return null;
  if (!store.db) store.db = drizzle(store.env.DB, { schema });
  return store.db;
}
