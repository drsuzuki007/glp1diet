import { z } from "zod";
import { publicProcedure, router } from "./trpc";

/**
 * Infrastructure-level procedures.
 *
 * `system.notifyOwner` used to post to the Manus notification service and was
 * removed with the rest of the Manus integration (nothing in the client called
 * it). If owner alerts are needed again, add a procedure here that posts to
 * email/Slack from the Worker.
 */
export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),
});
