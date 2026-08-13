import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getCatalogFilters,
  getCourseActions,
  getCourseBySlug,
  getFeaturedCourse,
  getSubscriptionStatus,
  getUserLibrary,
  listCourses,
  toggleWishlist,
  updateCourseProgress,
} from "./db";
import { createBillingPortal, createSubscriptionCheckout, refreshStripeSubscription } from "./stripe";

export const courseFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().max(64).optional(),
  duration: z.enum(["under30", "30to45", "over45"]).optional(),
  doctor: z.string().max(64).optional(),
  published: z.enum(["month", "quarter", "year"]).optional(),
  sort: z.enum(["newest", "duration"]).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    filters: publicProcedure.query(() => getCatalogFilters()),
    list: publicProcedure.input(courseFilterSchema.optional()).query(({ input }) => listCourses(input)),
    featured: publicProcedure.query(async () => {
      const course = await getFeaturedCourse();
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "注目講座が見つかりません。" });
      return course;
    }),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(96) })).query(async ({ input }) => {
      const course = await getCourseBySlug(input.slug);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "講座が見つかりません。" });
      return course;
    }),
    actions: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).query(({ ctx, input }) => getCourseActions(ctx.user.id, input.courseId)),
    toggleWishlist: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleWishlist(ctx.user.id, input.courseId)),
    updateProgress: protectedProcedure.input(z.object({ courseId: z.number().int().positive(), progressPercent: z.number().min(0).max(100), lastPositionSeconds: z.number().int().min(0) })).mutation(({ ctx, input }) => updateCourseProgress(ctx.user.id, input.courseId, input.progressPercent, input.lastPositionSeconds)),
  }),
  subscription: router({
    mine: protectedProcedure.query(({ ctx }) => getSubscriptionStatus(ctx.user.id)),
    refresh: protectedProcedure.mutation(({ ctx }) => refreshStripeSubscription(ctx.user.id)),
    createCheckout: protectedProcedure.mutation(({ ctx }) => createSubscriptionCheckout({ userId: ctx.user.id, origin: ctx.req.headers.origin })),
    createBillingPortal: protectedProcedure.mutation(({ ctx }) => createBillingPortal({ userId: ctx.user.id, origin: ctx.req.headers.origin })),
  }),
  library: router({
    mine: protectedProcedure.query(({ ctx }) => getUserLibrary(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
