/**
 * Cloudflare Worker entry point — this is the whole server.
 *
 * Route table (URLs unchanged from the Express deployment):
 *
 *   POST /api/stripe/webhook   Stripe events            -> worker/stripeWebhook.ts
 *   GET  /api/oauth/login      start Google sign-in     -> worker/auth/routes.ts
 *   GET  /api/oauth/callback   finish Google sign-in    -> worker/auth/routes.ts
 *   ALL  /api/trpc/*           the tRPC API             -> server/routers.ts
 *   GET  /manus-storage/*      course media from R2     -> worker/media.ts
 *   *                          the React app + SEO tags -> worker/html.ts
 *
 * Everything runs inside `runWithRequestContext`, which makes the request's
 * bindings reachable from `server/` via `getEnv()` / `getDb()`.
 */
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import { handleCallback, handleLogin } from "./auth/routes";
import type { AppEnv } from "./env";
import { handleDocument } from "./html";
import { handleMedia, MEDIA_PATH_PREFIX } from "./media";
import { createRequestContext, runWithRequestContext, type RequestContext } from "./runtime";
import { handleStripeWebhook } from "./stripeWebhook";

const TRPC_ENDPOINT = "/api/trpc";

/** Copies cookies set through `ctx.res.cookie()` onto the outgoing response. */
function withContextCookies(response: Response, context: RequestContext): Response {
  const cookies =
    typeof context.resHeaders.getSetCookie === "function"
      ? context.resHeaders.getSetCookie()
      : [];
  if (cookies.length === 0) return response;

  const headers = new Headers(response.headers);
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function route(request: Request, context: RequestContext): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === "/api/stripe/webhook") {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    return handleStripeWebhook(request);
  }

  if (pathname === "/api/oauth/login") return handleLogin(request);
  if (pathname === "/api/oauth/callback") return handleCallback(request);

  if (pathname === TRPC_ENDPOINT || pathname.startsWith(`${TRPC_ENDPOINT}/`)) {
    const response = await fetchRequestHandler({
      endpoint: TRPC_ENDPOINT,
      req: request,
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] ${path ?? "<no path>"} failed:`, error);
        }
      },
    });
    return withContextCookies(response, context);
  }

  if (pathname.startsWith(MEDIA_PATH_PREFIX)) return handleMedia(request);

  return withContextCookies(await handleDocument(request), context);
}

export default {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    const context = createRequestContext(request, env, ctx);
    return runWithRequestContext(context, async () => {
      try {
        return await route(request, context);
      } catch (error) {
        console.error("[Worker] Unhandled request error", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    });
  },
} satisfies ExportedHandler<AppEnv>;
