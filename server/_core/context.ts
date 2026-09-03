import type { User } from "../../drizzle/schema";
import type { ExpressLikeRequest, ExpressLikeResponse } from "../../worker/http";
import { getRequestContext } from "../../worker/runtime";
import { authenticateRequest } from "./auth";

/**
 * tRPC context.
 *
 * `req` / `res` keep their Express-like shape so the routers and the existing
 * tests need no changes; they are backed by the Fetch request and the Worker's
 * response headers (see worker/http.ts).
 */
export type TrpcContext = {
  req: ExpressLikeRequest;
  res: ExpressLikeResponse;
  user: User | null;
};

export async function createContext(): Promise<TrpcContext> {
  const { req, res } = getRequestContext();

  let user: User | null = null;
  try {
    user = await authenticateRequest(req);
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  return { req, res, user };
}
