/**
 * Session token handling (replaces the Manus SDK's session helpers).
 *
 * The token format is unchanged — an HS256 JWT carrying `{ openId, appId, name }`
 * stored in the `app_session_id` cookie — so the client and the existing tests
 * keep working after the move to Google sign-in.
 */
import { SignJWT, jwtVerify } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function sessionSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured. Set it in .dev.vars (local) or `wrangler secret put JWT_SECRET`."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({
    openId: payload.openId,
    appId: payload.appId,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(sessionSecret());
}

export async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  return signSession(
    { openId, appId: ENV.appId, name: options.name ?? "" },
    options
  );
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;

  try {
    const { payload } = await jwtVerify(cookieValue, sessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, appId, name } = payload as Record<string, unknown>;

    if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
      console.warn("[Auth] Session payload missing required fields");
      return null;
    }

    return { openId, appId, name: isNonEmptyString(name) ? name : "" };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}
