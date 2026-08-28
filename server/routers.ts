import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getCatalogFilters,
  getCourseActions,
  getCourseBySlug,
  replaceCourseReferenceLinks,
  addLearningGoal,
  getLearningGoals,
  getFeaturedCourse,
  getStreamingCatalogAdminData,
  getStreamingCatalogRows,
  getSubscriptionStatus,
  getUserLibrary,
  listCourses,
  removeLearningGoal,
  reorderLearningGoals,
  reorderStreamingCatalogRows,
  replaceStreamingCatalogRowCourses,
  toggleWishlist,
  updateCourseProgress,
} from "./db";
import { createBillingPortal, createSubscriptionCheckout, createTeamBillingPortal, getStripeBillingSummary, refreshStripeSubscription, scheduleStripeSubscriptionCancellation } from "./stripe";
import { getTeamAdminDashboard, getTeamForMember, joinTeamWithAccessCode, removeTeamMemberByAdmin } from "./teams";

export const courseFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().max(64).optional(),
  duration: z.enum(["under30", "30to45", "over45"]).optional(),
  doctor: z.string().max(64).optional(),
  published: z.enum(["month", "quarter", "year"]).optional(),
  sort: z.enum(["newest", "duration"]).optional(),
});

export const courseReferenceLinkSchema = z.object({
  label: z.string().trim().min(1, "表示名を入力してください。").max(180),
  url: z.url("有効なhttps URLを入力してください。").max(2048).refine(value => value.startsWith("https://"), "https URLを入力してください。"),
});

export const courseReferenceLinksSchema = z.array(courseReferenceLinkSchema).max(3, "参考URLは最大3件です。").superRefine((links, ctx) => {
  if (new Set(links.map(link => link.url)).size !== links.length) {
    ctx.addIssue({ code: "custom", message: "同じURLは重複して登録できません。" });
  }
});

export const catalogRowOrderSchema = z.array(z.number().int().positive()).min(1);
export const catalogRowCoursesSchema = z.object({ rowId: z.number().int().positive(), courseIds: z.array(z.number().int().positive()).max(200) });
export const teamAccessCodeSchema = z.string().trim().toUpperCase().regex(/^TEAM-[A-Z0-9]{4}-[A-Z0-9]{4}$/, "チームコードの形式を確認してください。");

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
    rows: publicProcedure.query(() => getStreamingCatalogRows()),
    adminRows: adminProcedure.query(() => getStreamingCatalogAdminData()),
    reorderRows: adminProcedure.input(catalogRowOrderSchema).mutation(({ input }) => reorderStreamingCatalogRows(input)),
    replaceRowCourses: adminProcedure.input(catalogRowCoursesSchema).mutation(({ input }) => replaceStreamingCatalogRowCourses(input.rowId, input.courseIds)),
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
    updateReferenceLinks: adminProcedure.input(z.object({ courseId: z.number().int().positive(), links: courseReferenceLinksSchema })).mutation(({ input }) => replaceCourseReferenceLinks(input.courseId, input.links)),
    actions: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).query(({ ctx, input }) => getCourseActions(ctx.user.id, input.courseId)),
    toggleWishlist: protectedProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleWishlist(ctx.user.id, input.courseId)),
    updateProgress: protectedProcedure.input(z.object({ courseId: z.number().int().positive(), progressPercent: z.number().min(0).max(100), lastPositionSeconds: z.number().int().min(0) })).mutation(({ ctx, input }) => updateCourseProgress(ctx.user.id, input.courseId, input.progressPercent, input.lastPositionSeconds)),
  }),
  subscription: router({
    mine: protectedProcedure.query(({ ctx }) => getSubscriptionStatus(ctx.user.id)),
    billingSummary: protectedProcedure.query(({ ctx }) => getStripeBillingSummary({ userId: ctx.user.id })),
    refresh: protectedProcedure.mutation(({ ctx }) => refreshStripeSubscription(ctx.user.id)),
    createCheckout: protectedProcedure.mutation(({ ctx }) => createSubscriptionCheckout({ userId: ctx.user.id, origin: ctx.req.headers.origin })),
    createBillingPortal: protectedProcedure.mutation(({ ctx }) => createBillingPortal({ userId: ctx.user.id, origin: ctx.req.headers.origin })),
    scheduleCancellation: protectedProcedure.mutation(({ ctx }) => scheduleStripeSubscriptionCancellation({ userId: ctx.user.id })),
  }),
  team: router({
    paymentLink: publicProcedure.query(() => ({ url: process.env.STRIPE_TEAM_PAYMENT_LINK_URL ?? null })),
    mine: protectedProcedure.query(({ ctx }) => getTeamForMember(ctx.user.id)),
    join: protectedProcedure.input(teamAccessCodeSchema).mutation(({ ctx, input }) => joinTeamWithAccessCode(ctx.user.id, input)),
    admin: protectedProcedure.query(({ ctx }) => getTeamAdminDashboard(ctx.user.id)),
    removeMember: protectedProcedure.input(z.object({ memberId: z.number().int().positive() })).mutation(({ ctx, input }) => removeTeamMemberByAdmin({ adminUserId: ctx.user.id, memberId: input.memberId })),
    createBillingPortal: protectedProcedure.mutation(({ ctx }) => createTeamBillingPortal({ userId: ctx.user.id, origin: ctx.req.headers.origin })),
  }),
  library: router({
    mine: protectedProcedure.query(({ ctx }) => getUserLibrary(ctx.user.id)),
  }),
  learningGoal: router({
    mine: protectedProcedure.query(({ ctx }) => getLearningGoals(ctx.user.id)),
    add: protectedProcedure.input(z.enum(["understand_glp1", "improve_lifestyle", "understand_checks", "prepare_for_visit"])).mutation(({ ctx, input }) => addLearningGoal(ctx.user.id, input)),
    remove: protectedProcedure.input(z.enum(["understand_glp1", "improve_lifestyle", "understand_checks", "prepare_for_visit"])).mutation(({ ctx, input }) => removeLearningGoal(ctx.user.id, input)),
    reorder: protectedProcedure.input(z.array(z.enum(["understand_glp1", "improve_lifestyle", "understand_checks", "prepare_for_visit"])).min(1).max(4)).mutation(({ ctx, input }) => reorderLearningGoals(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
