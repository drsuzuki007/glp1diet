/**
 * Google OAuth 2.0 (authorization-code flow).
 *
 * Replaces the Manus OAuth server. Only three things leave this file:
 *   buildAuthorizeUrl() – where to send the browser
 *   exchangeCode()      – code -> tokens
 *   verifyIdToken()     – id_token -> verified profile
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(JWKS_URL);
  return jwks;
}

export type GoogleProfile = {
  /** Google's stable subject id. */
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCode(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ idToken: string }> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
      code: input.code,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as { id_token?: string };
  if (!payload.id_token) throw new Error("Google token response had no id_token");
  return { idToken: payload.id_token };
}

export async function verifyIdToken(
  idToken: string,
  clientId: string
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer: ISSUERS,
    audience: clientId,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Google id_token had no subject");

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
    name:
      (typeof payload.name === "string" && payload.name) ||
      (typeof payload.email === "string" && payload.email) ||
      null,
  };
}
