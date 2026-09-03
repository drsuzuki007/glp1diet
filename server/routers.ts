import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  clearCourseVideo,
  listCoursesForVideoAdmin,
  moveCourseToNewArrivalsTop,
  setCourseVideo,
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
import { configuredEmbedDomains, durationToMinutes, fetchVimeoMetadata, readEmbedPrivacy, releaseEmbedRestriction, restrictEmbedToDomains } from "./vimeo";

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

export const vimeoUrlSchema = z.string().trim().min(1, "Vimeo の URL を入力してください。").max(300);

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
    // --- 動画（Vimeo）の管理 ------------------------------------------------
    /** 管理画面用の一覧。どの講座に動画が割り当て済みかを返す。 */
    videoLibrary: adminProcedure.query(() => listCoursesForVideoAdmin()),
    /** URL を貼り付けた時点でタイトル・サムネイル・再生時間を引いてくる（保存はしない）。 */
    resolveVimeo: adminProcedure.input(z.object({ url: vimeoUrlSchema })).mutation(async ({ input }) => {
      try {
        return await fetchVimeoMetadata(input.url);
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "動画情報を取得できませんでした。" });
      }
    }),
    /** 講座に動画を割り当てる。既定で新着動画枠の先頭へ繰り上げる。 */
    assignVimeo: adminProcedure
      .input(z.object({
        courseId: z.number().int().positive(),
        url: vimeoUrlSchema,
        addToNewArrivals: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        let metadata;
        try {
          metadata = await fetchVimeoMetadata(input.url);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "動画情報を取得できませんでした。" });
        }
        try {
          const course = await setCourseVideo({
            courseId: input.courseId,
            vimeoId: metadata.id,
            vimeoHash: metadata.hash,
            durationMinutes: durationToMinutes(metadata.durationSeconds),
          });
          if (input.addToNewArrivals) await moveCourseToNewArrivalsTop(input.courseId);
          // VIMEO_EMBED_DOMAINS が設定されていれば、Vimeo 側を「指定ドメインのみ埋め込み可」に切り替える。
          // 失敗しても登録自体は成立させ、結果を返して管理画面に表示する。
          const embedRestriction = await restrictEmbedToDomains(metadata.id);
          return { course, metadata, embedRestriction, embedDomains: configuredEmbedDomains() };
        } catch (error) {
          throw new TRPCError({ code: "CONFLICT", message: error instanceof Error ? error.message : "動画を登録できませんでした。" });
        }
      }),
    /** 割り当てを解除する。 */
    clearVimeo: adminProcedure.input(z.object({ courseId: z.number().int().positive() })).mutation(({ input }) => clearCourseVideo(input.courseId)),
    // --- 埋め込みドメイン制限 ------------------------------------------------
    /** 現在の設定値と、登録済み動画それぞれの Vimeo 側の状態を読む（変更はしない）。 */
    embedRestrictionStatus: adminProcedure.query(async () => {
      const domains = configuredEmbedDomains();
      const courses = (await listCoursesForVideoAdmin()).filter(course => course.vimeoId);
      const videos = await Promise.all(
        courses.map(async course => {
          try {
            return { courseId: course.id, courseTitle: course.title, ...(await readEmbedPrivacy(course.vimeoId!)), error: null as string | null };
          } catch (error) {
            return {
              courseId: course.id,
              courseTitle: course.title,
              vimeoId: course.vimeoId!,
              title: "",
              embed: "unknown",
              domains: [] as string[],
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );
      return { domains, videos };
    }),
    /**
     * 登録済み動画に埋め込みドメイン制限を適用する。
     * courseId を省略すると全件に適用する。VIMEO_EMBED_DOMAINS が空なら何もしない。
     */
    applyEmbedRestriction: adminProcedure
      .input(z.object({ courseId: z.number().int().positive().optional() }).optional())
      .mutation(async ({ input }) => {
        const domains = configuredEmbedDomains();
        if (domains.length === 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "VIMEO_EMBED_DOMAINS が未設定です。許可するドメインを設定してから実行してください。",
          });
        }
        const all = (await listCoursesForVideoAdmin()).filter(course => course.vimeoId);
        const targets = input?.courseId ? all.filter(course => course.id === input.courseId) : all;
        const results = await Promise.all(
          targets.map(async course => ({ courseTitle: course.title, ...(await restrictEmbedToDomains(course.vimeoId!, domains)) }))
        );
        return { domains, results };
      }),
    /** 制限を解除して、どこでも埋め込める状態に戻す（切り戻し用）。 */
    releaseEmbedRestriction: adminProcedure
      .input(z.object({ courseId: z.number().int().positive().optional() }).optional())
      .mutation(async ({ input }) => {
        const all = (await listCoursesForVideoAdmin()).filter(course => course.vimeoId);
        const targets = input?.courseId ? all.filter(course => course.id === input.courseId) : all;
        const results = await Promise.all(
          targets.map(async course => ({ courseTitle: course.title, ...(await releaseEmbedRestriction(course.vimeoId!)) }))
        );
        return { results };
      }),
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
    paymentLink: publicProcedure.query(() => ({ url: ENV.stripeTeamPaymentLinkUrl })),
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
