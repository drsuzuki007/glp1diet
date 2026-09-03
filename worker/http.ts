/**
 * Minimal Express-shaped request/response objects.
 *
 * The domain code (`server/`) was written against Express and is deliberately
 * left untouched by the Cloudflare migration: it still reads `ctx.req.headers`
 * and calls `ctx.res.cookie()` / `ctx.res.clearCookie()`. These two adapters
 * translate that surface onto a Fetch `Request` and a `Headers` object that the
 * Worker turns into real `Set-Cookie` headers.
 *
 * If you are adding new server code, prefer using the Fetch `Request` directly
 * (available as `getRequestContext().request`).
 */

export type CookieOptions = {
  domain?: string;
  httpOnly?: boolean;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  /** Milliseconds, like Express. Negative or 0 expires the cookie. */
  maxAge?: number;
};

export type ExpressLikeRequest = {
  method: string;
  url: string;
  originalUrl: string;
  protocol: "http" | "https";
  hostname: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  get(name: string): string | undefined;
};

export type ExpressLikeResponse = {
  cookie(name: string, value: string, options?: CookieOptions): void;
  clearCookie(name: string, options?: CookieOptions): void;
};

export function toExpressRequest(request: Request): ExpressLikeRequest {
  const url = new URL(request.url);
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const forwardedProto = headers["x-forwarded-proto"]?.split(",")[0]?.trim();
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : url.protocol === "https:"
        ? "https"
        : "http";

  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return {
    method: request.method,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    protocol,
    hostname: url.hostname,
    headers,
    query,
    get: (name: string) => headers[name.toLowerCase()],
  };
}

/**
 * Builds a `Set-Cookie` header value.
 *
 * `maxAge` is in **milliseconds** (like Express) and is emitted as seconds.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.maxAge !== undefined) {
    const seconds = Math.floor(options.maxAge / 1000);
    parts.push(`Max-Age=${seconds}`);
    parts.push(`Expires=${new Date(Date.now() + options.maxAge).toUTCString()}`);
  }
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) {
    const sameSite = options.sameSite;
    parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);
  }
  return parts.join("; ");
}

/** Writes `Set-Cookie` headers into `resHeaders`, mimicking Express' res.cookie. */
export function createExpressResponse(resHeaders: Headers): ExpressLikeResponse {
  const write = (name: string, value: string, options: CookieOptions = {}) => {
    resHeaders.append("Set-Cookie", serializeCookie(name, value, options));
  };

  return {
    cookie: write,
    clearCookie: (name, options = {}) => write(name, "", { ...options, maxAge: 0 }),
  };
}
