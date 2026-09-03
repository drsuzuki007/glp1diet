/**
 * Request authentication (replaces server/_core/sdk.ts).
 *
 * Reads the session cookie (or an `Authorization: Bearer` fallback), verifies
 * it, and resolves the matching row in the `users` table. Users are created by
 * the Google OAuth callback, so an unknown `openId` here means a stale cookie.
 */
import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { User } from "../../drizzle/schema";
import type { ExpressLikeRequest } from "../../worker/http";
import * as db from "../db";
import { verifySession } from "./session";

export type AuthenticatedUser = User;

function readSessionToken(req: ExpressLikeRequest): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const fromCookie = cookies[COOKIE_NAME];
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return undefined;
}

export async function authenticateRequest(
  req: ExpressLikeRequest
): Promise<AuthenticatedUser> {
  const session = await verifySession(readSessionToken(req));
  if (!session) throw ForbiddenError("Invalid session cookie");

  const user = await db.getUserByOpenId(session.openId);
  if (!user) throw ForbiddenError("User not found");

  // Refresh the "last seen" timestamp without blocking the response path.
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

  return user;
}
