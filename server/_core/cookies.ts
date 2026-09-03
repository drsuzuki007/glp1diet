import type { CookieOptions, ExpressLikeRequest } from "../../worker/http";

function isSecureRequest(req: ExpressLikeRequest) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  return forwardedProto
    .split(",")
    .some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * Session cookie attributes.
 *
 * On HTTPS the cookie stays `SameSite=None; Secure` exactly as before, so
 * existing sessions and any embedded usage keep working. On plain HTTP
 * (`vite dev` on localhost) browsers reject `SameSite=None` without `Secure`,
 * so we fall back to `Lax` — the app is first-party there.
 */
export function getSessionCookieOptions(
  req: ExpressLikeRequest
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
