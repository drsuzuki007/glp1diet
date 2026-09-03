/**
 * Sign-in endpoints.
 *
 *   GET /api/oauth/login?returnTo=/path   -> redirect to Google
 *   GET /api/oauth/callback?code&state    -> set the session cookie, redirect back
 *
 * The callback path is unchanged from the Manus version, so the site's own URLs
 * stay compatible; only the identity provider behind it changed.
 *
 * CSRF: `state` is a short-lived JWT signed with JWT_SECRET, and the nonce it
 * carries must also be present as a one-time cookie in the same browser.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { getSessionCookieOptions } from "../../server/_core/cookies";
import { ENV } from "../../server/_core/env";
import { createSessionToken } from "../../server/_core/session";
import * as db from "../../server/db";
import { serializeCookie } from "../http";
import { getRequestContext } from "../runtime";
import { buildAuthorizeUrl, exchangeCode, verifyIdToken } from "./google";

const STATE_TTL_SECONDS = 600;
const SECURE_STATE_COOKIE = "__Host-oauth_state";
const INSECURE_STATE_COOKIE = "oauth_state";

/** `__Host-` requires Secure, which plain-HTTP localhost cannot set. */
function stateCookieName(secure: boolean) {
  return secure ? SECURE_STATE_COOKIE : INSECURE_STATE_COOKIE;
}

function stateSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET is not configured.");
  return new TextEncoder().encode(secret);
}

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? `${forwardedProto}:` : url.protocol;
  return `${protocol}//${url.host}`;
}

/** Only same-site paths are accepted, so `returnTo` can never become an open redirect. */
function safeReturnTo(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function requireGoogleConfig() {
  const clientId = ENV.googleClientId;
  const clientSecret = ENV.googleClientSecret;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .dev.vars or as Worker secrets."
    );
  }
  return { clientId, clientSecret };
}

export async function handleLogin(request: Request): Promise<Response> {
  const { clientId } = requireGoogleConfig();
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const secure = origin.startsWith("https://");
  const redirectUri = `${origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();

  const state = await new SignJWT({
    nonce,
    returnTo: safeReturnTo(url.searchParams.get("returnTo")),
    redirectUri,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS)
    .sign(stateSecret());

  const headers = new Headers({
    Location: buildAuthorizeUrl({ clientId, redirectUri, state }),
    "Cache-Control": "no-store",
  });
  headers.append(
    "Set-Cookie",
    serializeCookie(stateCookieName(secure), nonce, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: STATE_TTL_SECONDS * 1000,
    })
  );

  return new Response(null, { status: 302, headers });
}

export async function handleCallback(request: Request): Promise<Response> {
  const { clientId, clientSecret } = requireGoogleConfig();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return Response.json({ error: "code and state are required" }, { status: 400 });
  }

  const origin = requestOrigin(request);
  const secure = origin.startsWith("https://");
  const cookieName = stateCookieName(secure);

  let claims: Record<string, unknown>;
  try {
    claims = (await jwtVerify(state, stateSecret())).payload as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid oauth state" }, { status: 403 });
  }

  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");
  if (typeof claims.nonce !== "string" || claims.nonce !== cookies[cookieName]) {
    return Response.json({ error: "invalid oauth state" }, { status: 403 });
  }

  const redirectUri =
    typeof claims.redirectUri === "string" ? claims.redirectUri : `${origin}/api/oauth/callback`;
  const returnTo = safeReturnTo(typeof claims.returnTo === "string" ? claims.returnTo : "/");

  try {
    const { idToken } = await exchangeCode({ clientId, clientSecret, redirectUri, code });
    const profile = await verifyIdToken(idToken, clientId);

    // `openId` keeps the "<provider>:<id>" shape the users table already stores.
    const openId = `google:${profile.sub}`;

    // Data migration: a row imported from the pre-Cloudflare database still has
    // its old Manus openId. If Google vouched for this email and exactly one
    // such row matches, adopt it so the account keeps its subscription, role
    // and history. No-op once migrated, and on a database with no legacy rows.
    if (profile.email && profile.emailVerified) {
      await db.relinkLegacyOpenIdByEmail(profile.email, openId);
    }

    await db.upsertUser({
      openId,
      name: profile.name,
      email: profile.email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    const sessionToken = await createSessionToken(openId, {
      name: profile.name ?? "",
      expiresInMs: ONE_YEAR_MS,
    });

    const { req } = getRequestContext();
    const cookieOptions = getSessionCookieOptions(req);
    const headers = new Headers({ Location: returnTo, "Cache-Control": "no-store" });
    headers.append(
      "Set-Cookie",
      serializeCookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      })
    );
    // Burn the one-time state cookie.
    headers.append(
      "Set-Cookie",
      serializeCookie(cookieName, "", { path: "/", httpOnly: true, secure, sameSite: "lax", maxAge: 0 })
    );

    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return Response.json({ error: "OAuth callback failed" }, { status: 500 });
  }
}
