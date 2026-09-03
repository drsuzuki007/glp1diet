import { and, asc, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import { getRequestDb, type Database } from "../worker/runtime";
import { catalogRows, categories, courseCatalogRows, courseReferenceLinks, courses, doctors, InsertUser, learningActivities, learningGoals, subscriptions, users, viewingProgress, wishlists } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { ensureCatalogSeed } from "./seed";
import { shouldApplyStripeEvent, StripeSubscriptionStatus, subscriptionAccessState } from "../shared/subscription";
import { buildMonthlyLearningReport, mergeHistoricalProgressForReport } from "../shared/learningReport";
import { buildRecommendations } from "../shared/recommendations";
import { type LearningGoalValue } from "../shared/learningGoals";
import { getTeamForMember } from "./teams";

export const SUBSCRIPTION_PRICE_YEN = 980;

/**
 * The D1-backed drizzle handle for the current request.
 *
 * Returns null outside a request (unit tests, CLI scripts) so callers that can
 * degrade gracefully keep the same behaviour as the old MySQL version when
 * `DATABASE_URL` was unset. Use `readyDb()` when a database is required.
 */
export async function getDb(): Promise<Database | null> {
  return getRequestDb();
}

type BatchItem = Parameters<Database["batch"]>[0][number];

/**
 * D1 has no interactive transactions, so multi-statement writes go through
 * `batch()`, which runs them atomically in order.
 */
async function runBatch(db: Database, statements: BatchItem[]) {
  if (statements.length === 0) return;
  await db.batch(statements as unknown as [BatchItem, ...BatchItem[]]);
}

/** The site owner may be identified by openId or, more conveniently, by email. */
export function isOwner(openId: string | null | undefined, email?: string | null): boolean {
  if (openId && ENV.ownerOpenId && openId === ENV.ownerOpenId) return true;
  const ownerEmail = ENV.ownerEmail.trim().toLowerCase();
  if (!ownerEmail || !email) return false;
  return email.trim().toLowerCase() === ownerEmail;
}

export type LegacyUserRow = { id: number; openId: string };

/**
 * Decides which pre-migration row a freshly signed-in Google account should
 * take over.
 *
 * Pure so it can be unit tested; `relinkLegacyOpenIdByEmail` does the I/O.
 * The rule is deliberately conservative — it only acts when there is exactly
 * one candidate, so an ambiguous match never merges two people's accounts.
 */
export function chooseLegacyRowToRelink(
  rowsWithSameEmail: LegacyUserRow[],
  newOpenId: string
): LegacyUserRow | null {
  // Already migrated (or the row is the new account itself): nothing to do.
  if (rowsWithSameEmail.some(row => row.openId === newOpenId)) return null;
  const legacy = rowsWithSameEmail.filter(row => !row.openId.startsWith("google:"));
  return legacy.length === 1 ? legacy[0]! : null;
}

/**
 * Data-migration bridge: adopt a pre-migration account by verified email.
 *
 * Before the Cloudflare migration `users.openId` held a Manus identifier; after
 * it, Google's `google:<sub>`. On the first Google sign-in we look for a single
 * legacy row with the same email and rewrite its `openId`, so the subscription,
 * wishlist, progress and role all follow the person over without touching any
 * other table.
 *
 * Returns true when a row was adopted. Only ever called with an email Google
 * has marked verified (see worker/auth/routes.ts).
 */
export async function relinkLegacyOpenIdByEmail(
  email: string,
  newOpenId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const rows = await db
    .select({ id: users.id, openId: users.openId })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(10);

  const target = chooseLegacyRowToRelink(rows, newOpenId);
  if (!target) return false;

  await db.update(users).set({ openId: newOpenId }).where(eq(users.id, target.id));
  console.log(`[Migration] Relinked user #${target.id} (${target.openId} -> ${newOpenId}) by email`);
  return true;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (isOwner(user.openId, user.email)) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
  return result[0];
}

export async function setStripeCustomerId(userId: number, stripeCustomerId: string) {
  const db = await readyDb();
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
}

export async function syncStripeSubscription(input: {
  userId: number;
  stripeSubscriptionId: string;
  status: StripeSubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeEventCreatedAt: Date;
}) {
  const db = await readyDb();
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, input.userId)).limit(1);
  const values = {
    status: input.status,
    stripeSubscriptionId: input.stripeSubscriptionId,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    stripeEventCreatedAt: input.stripeEventCreatedAt,
    renewedAt: new Date(),
  };
  if (existing[0]) {
    if (!shouldApplyStripeEvent(existing[0].stripeEventCreatedAt, input.stripeEventCreatedAt)) return false;
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, existing[0].id));
  } else {
    await db.insert(subscriptions).values({ userId: input.userId, monthlyPrice: SUBSCRIPTION_PRICE_YEN, ...values });
  }
  const hasStandardAccess = input.status === "active" || input.status === "trialing";
  await db.update(users).set({
    plan: hasStandardAccess ? "standard" : "free",
    subscriptionStatus: input.status,
    currentPeriodEnd: input.currentPeriodEnd,
  }).where(eq(users.id, input.userId));
  return true;
}

export type CourseFilters = {
  search?: string;
  category?: string;
  duration?: "under30" | "30to45" | "over45";
  doctor?: string;
  published?: "month" | "quarter" | "year";
  sort?: "newest" | "duration";
};

const courseSelect = {
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  summary: courses.summary,
  durationMinutes: courses.durationMinutes,
  publishedAt: courses.publishedAt,
  reviewedAt: courses.reviewedAt,
  thumbnailTheme: courses.thumbnailTheme,
  previewLabel: courses.previewLabel,
  isFeatured: courses.isFeatured,
  category: { id: categories.id, slug: categories.slug, name: categories.name, description: categories.description },
  doctor: { id: doctors.id, slug: doctors.slug, name: doctors.name, specialty: doctors.specialty, affiliation: doctors.affiliation, initials: doctors.initials },
};

async function readyDb() {
  const db = await getDb();
  if (!db) throw new Error("データベースに接続できませんでした。");
  await ensureCatalogSeed(db);
  return db;
}

async function subscriptionByUser(db: Database, userId: number) {
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result[0] ?? null;
}

async function activeSubscription(db: Database, userId: number) {
  const result = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["active", "trialing"]))).limit(1);
  return result[0] ?? null;
}

export async function listCourses(filters: CourseFilters = {}) {
  const db = await readyDb();
  const conditions = [];
  const keyword = filters.search?.trim();
  if (keyword) conditions.push(or(like(courses.title, `%${keyword}%`), like(courses.summary, `%${keyword}%`), like(categories.name, `%${keyword}%`), like(doctors.name, `%${keyword}%`))!);
  if (filters.category) conditions.push(eq(categories.slug, filters.category));
  if (filters.doctor) conditions.push(eq(doctors.slug, filters.doctor));
  if (filters.duration === "under30") conditions.push(lte(courses.durationMinutes, 29));
  if (filters.duration === "30to45") conditions.push(and(gte(courses.durationMinutes, 30), lte(courses.durationMinutes, 45))!);
  if (filters.duration === "over45") conditions.push(gte(courses.durationMinutes, 46));
  if (filters.published) {
    const days = filters.published === "month" ? 31 : filters.published === "quarter" ? 92 : 366;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    conditions.push(gte(courses.publishedAt, threshold));
  }
  const order = filters.sort === "duration" ? desc(courses.durationMinutes) : desc(courses.publishedAt);
  return db.select(courseSelect).from(courses).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(order);
}

export async function getCatalogFilters() {
  const db = await readyDb();
  const [categoryRows, doctorRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select({ slug: doctors.slug, name: doctors.name, specialty: doctors.specialty }).from(doctors).orderBy(asc(doctors.name)),
  ]);
  return { categories: categoryRows, doctors: doctorRows };
}

export async function getCourseBySlug(slug: string) {
  const db = await readyDb();
  const result = await db.select({
    ...courseSelect,
    description: courses.description,
    intendedFor: courses.intendedFor,
    learningPoints: courses.learningPoints,
    referencesText: courses.referencesText,
    coiText: courses.coiText,
    doctorProfile: doctors.profile,
  }).from(courses).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(courses.slug, slug)).limit(1);
  const course = result[0];
  if (!course) return undefined;
  const referenceLinks = await getCourseReferenceLinks(course.id, db);
  return { ...course, referenceLinks };
}

export type CourseReferenceLinkInput = { label: string; url: string };

async function getCourseReferenceLinks(courseId: number, dbOverride?: Database) {
  const db = dbOverride ?? await readyDb();
  return db.select({
    id: courseReferenceLinks.id,
    label: courseReferenceLinks.label,
    url: courseReferenceLinks.url,
    sortOrder: courseReferenceLinks.sortOrder,
  }).from(courseReferenceLinks).where(eq(courseReferenceLinks.courseId, courseId)).orderBy(asc(courseReferenceLinks.sortOrder));
}

export async function replaceCourseReferenceLinks(courseId: number, links: CourseReferenceLinkInput[]) {
  if (links.length > 3) throw new Error("参考URLは1講座につき最大3件までです。");
  const db = await readyDb();
  const course = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course[0]) throw new Error("講座が見つかりません。");

  const statements: BatchItem[] = [
    db.delete(courseReferenceLinks).where(eq(courseReferenceLinks.courseId, courseId)) as BatchItem,
  ];
  if (links.length > 0) {
    statements.push(db.insert(courseReferenceLinks).values(links.map((link, index) => ({
      courseId,
      label: link.label.trim(),
      url: link.url,
      sortOrder: index + 1,
    }))) as BatchItem);
  }
  await runBatch(db, statements);
  return getCourseReferenceLinks(courseId, db);
}

export async function getFeaturedCourse() {
  const db = await readyDb();
  const result = await db.select(courseSelect).from(courses).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(courses.isFeatured, true)).orderBy(desc(courses.publishedAt)).limit(1);
  return result[0];
}

export async function getStreamingCatalogRows() {
  const db = await readyDb();
  const [rows, memberships] = await Promise.all([
    db.select({ id: catalogRows.id, slug: catalogRows.slug, name: catalogRows.name, description: catalogRows.description, sortOrder: catalogRows.sortOrder }).from(catalogRows).orderBy(asc(catalogRows.sortOrder)),
    db.select({ rowId: courseCatalogRows.rowId, rowSortOrder: courseCatalogRows.sortOrder, ...courseSelect })
      .from(courseCatalogRows)
      .innerJoin(courses, eq(courseCatalogRows.courseId, courses.id))
      .innerJoin(categories, eq(courses.categoryId, categories.id))
      .innerJoin(doctors, eq(courses.doctorId, doctors.id))
      .orderBy(asc(courseCatalogRows.rowId), asc(courseCatalogRows.sortOrder)),
  ]);
  const coursesByRow = new Map<number, typeof memberships>();
  memberships.forEach(membership => {
    const existing = coursesByRow.get(membership.rowId) ?? [];
    existing.push(membership);
    coursesByRow.set(membership.rowId, existing);
  });
  return rows.map(row => ({ ...row, courses: (coursesByRow.get(row.id) ?? []).map(({ rowId: _rowId, rowSortOrder: _rowSortOrder, ...course }) => course) }));
}

export async function getStreamingCatalogAdminData() {
  const [rows, coursesForAssignment] = await Promise.all([getStreamingCatalogRows(), listCourses({ sort: "newest" })]);
  return { rows, courses: coursesForAssignment };
}

export async function reorderStreamingCatalogRows(orderedRowIds: number[]) {
  const db = await readyDb();
  const existingRows = await db.select({ id: catalogRows.id }).from(catalogRows).orderBy(asc(catalogRows.sortOrder));
  const existingIds = existingRows.map(row => row.id);
  if (orderedRowIds.length !== existingIds.length || new Set(orderedRowIds).size !== orderedRowIds.length || orderedRowIds.some(id => !existingIds.includes(id))) throw new Error("カタログ行の並び順が不正です。");
  // Two passes: park every row in a spare range first so the unique sort order
  // is never violated half-way through, then write the final positions.
  const statements: BatchItem[] = [];
  for (let index = 0; index < orderedRowIds.length; index += 1) statements.push(db.update(catalogRows).set({ sortOrder: index + 1000 }).where(eq(catalogRows.id, orderedRowIds[index]!)) as BatchItem);
  for (let index = 0; index < orderedRowIds.length; index += 1) statements.push(db.update(catalogRows).set({ sortOrder: index + 1 }).where(eq(catalogRows.id, orderedRowIds[index]!)) as BatchItem);
  await runBatch(db, statements);
  return getStreamingCatalogRows();
}

export async function replaceStreamingCatalogRowCourses(rowId: number, orderedCourseIds: number[]) {
  const db = await readyDb();
  if (new Set(orderedCourseIds).size !== orderedCourseIds.length) throw new Error("同じ講座は1つの行に重複して登録できません。");
  const [row, availableCourses] = await Promise.all([
    db.select({ id: catalogRows.id }).from(catalogRows).where(eq(catalogRows.id, rowId)).limit(1),
    db.select({ id: courses.id }).from(courses),
  ]);
  if (!row[0]) throw new Error("カタログ行が見つかりません。");
  const availableIds = new Set(availableCourses.map(course => course.id));
  if (orderedCourseIds.some(id => !availableIds.has(id))) throw new Error("指定された講座が見つかりません。");
  const statements: BatchItem[] = [
    db.delete(courseCatalogRows).where(eq(courseCatalogRows.rowId, rowId)) as BatchItem,
  ];
  if (orderedCourseIds.length > 0) {
    statements.push(db.insert(courseCatalogRows).values(orderedCourseIds.map((courseId, index) => ({ rowId, courseId, sortOrder: index + 1 }))) as BatchItem);
  }
  await runBatch(db, statements);
  return getStreamingCatalogRows();
}

export async function getSubscriptionStatus(userId: number) {
  const db = await readyDb();
  const [subscription, team] = await Promise.all([subscriptionByUser(db, userId), getTeamForMember(userId)]);
  const individualAccess = subscriptionAccessState(subscription);
  return { ...individualAccess, subscribed: individualAccess.subscribed || Boolean(team), monthlyPrice: SUBSCRIPTION_PRICE_YEN, subscription, team };
}

export async function getLearningGoals(userId: number) {
  const db = await readyDb();
  const result = await db.select().from(learningGoals).where(eq(learningGoals.userId, userId)).orderBy(asc(learningGoals.priority), asc(learningGoals.createdAt));
  return result.map(item => ({ goal: item.goal as LearningGoalValue, priority: item.priority }));
}

export async function addLearningGoal(userId: number, goal: LearningGoalValue) {
  const db = await readyDb();
  const existingGoals = await db.select({ goal: learningGoals.goal, priority: learningGoals.priority }).from(learningGoals).where(eq(learningGoals.userId, userId));
  if (!existingGoals.some(item => item.goal === goal)) {
    await db.insert(learningGoals).values({ userId, goal, priority: Math.max(...existingGoals.map(item => item.priority), 0) + 1 });
  }
  return getLearningGoals(userId);
}

export async function removeLearningGoal(userId: number, goal: LearningGoalValue) {
  const db = await readyDb();
  await db.delete(learningGoals).where(and(eq(learningGoals.userId, userId), eq(learningGoals.goal, goal)));
  return getLearningGoals(userId);
}

export async function reorderLearningGoals(userId: number, orderedGoals: LearningGoalValue[]) {
  const db = await readyDb();
  const existing = await getLearningGoals(userId);
  const existingValues = existing.map(item => item.goal);
  const expected = new Set(existingValues);
  if (orderedGoals.length !== existingValues.length || new Set(orderedGoals).size !== orderedGoals.length || orderedGoals.some(goal => !expected.has(goal))) {
    throw new Error("学習目標の並び順が不正です。");
  }
  for (let index = 0; index < orderedGoals.length; index += 1) {
    const goal = orderedGoals[index]!;
    await db.update(learningGoals).set({ priority: index + 1 }).where(and(eq(learningGoals.userId, userId), eq(learningGoals.goal, goal)));
  }
  return getLearningGoals(userId);
}

/**
 * 視聴できる人にだけ動画の再生情報を渡すための判定。
 *
 * 非会員のレスポンスに Vimeo の ID が混ざらないよう、ここで必ず絞る。純粋関数なので
 * テストで固定できる（server/vimeoEntitlement.test.ts）。
 */
export function entitledVideo(
  subscribed: boolean,
  course: { vimeoId: string | null; vimeoHash: string | null } | undefined
): { vimeoId: string | null; vimeoHash: string | null } {
  if (!subscribed || !course?.vimeoId) return { vimeoId: null, vimeoHash: null };
  return { vimeoId: course.vimeoId, vimeoHash: course.vimeoHash ?? null };
}

export async function getCourseActions(userId: number, courseId: number) {
  const db = await readyDb();
  const [wishlistRows, subscription, progressRows, team, courseRows] = await Promise.all([
    db.select().from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.courseId, courseId))).limit(1),
    subscriptionByUser(db, userId),
    db.select().from(viewingProgress).where(and(eq(viewingProgress.userId, userId), eq(viewingProgress.courseId, courseId))).limit(1),
    getTeamForMember(userId),
    db.select({ vimeoId: courses.vimeoId, vimeoHash: courses.vimeoHash }).from(courses).where(eq(courses.id, courseId)).limit(1),
  ]);
  const individualAccess = subscriptionAccessState(subscription);
  const subscribed = individualAccess.subscribed || Boolean(team);
  return {
    wishlisted: wishlistRows.length > 0,
    ...individualAccess,
    subscribed,
    monthlyPrice: SUBSCRIPTION_PRICE_YEN,
    progress: progressRows[0] ?? null,
    team,
    // 講座ページのプレーヤーはこの値だけを見る。非会員には null が返る。
    ...entitledVideo(subscribed, courseRows[0]),
  };
}

/** 管理画面用: 講座に Vimeo 動画を割り当てる。 */
export async function setCourseVideo(input: {
  courseId: number;
  vimeoId: string;
  vimeoHash: string | null;
  durationMinutes?: number | null;
}) {
  const db = await readyDb();
  const course = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, input.courseId)).limit(1);
  if (!course[0]) throw new Error("講座が見つかりません。");

  const duplicate = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(and(eq(courses.vimeoId, input.vimeoId), ne(courses.id, input.courseId)))
    .limit(1);
  if (duplicate[0]) {
    throw new Error(`この動画はすでに「${duplicate[0].title}」に登録されています。`);
  }

  const values: Record<string, unknown> = { vimeoId: input.vimeoId, vimeoHash: input.vimeoHash };
  if (input.durationMinutes) values.durationMinutes = input.durationMinutes;
  await db.update(courses).set(values).where(eq(courses.id, input.courseId));

  return getCourseAdminSummary(input.courseId);
}

/** 管理画面用: 割り当てを解除する。 */
export async function clearCourseVideo(courseId: number) {
  const db = await readyDb();
  await db.update(courses).set({ vimeoId: null, vimeoHash: null }).where(eq(courses.id, courseId));
  return getCourseAdminSummary(courseId);
}

async function getCourseAdminSummary(courseId: number) {
  const db = await readyDb();
  const rows = await db
    .select({ id: courses.id, slug: courses.slug, title: courses.title, durationMinutes: courses.durationMinutes, vimeoId: courses.vimeoId, vimeoHash: courses.vimeoHash })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  return rows[0]!;
}

/** 管理画面用の講座一覧。動画の割り当て状況を含む。 */
export async function listCoursesForVideoAdmin() {
  const db = await readyDb();
  return db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      durationMinutes: courses.durationMinutes,
      vimeoId: courses.vimeoId,
      vimeoHash: courses.vimeoHash,
      publishedAt: courses.publishedAt,
    })
    .from(courses)
    .orderBy(desc(courses.publishedAt));
}

export const NEW_ARRIVALS_ROW_SLUG = "new-releases";

/**
 * 講座を「新着動画」棚の先頭へ移動する。すでに棚にある場合は先頭へ繰り上げる。
 * 棚が存在しない環境（シード前）では何もしない。
 */
export async function moveCourseToNewArrivalsTop(courseId: number) {
  const db = await readyDb();
  const row = await db.select({ id: catalogRows.id }).from(catalogRows).where(eq(catalogRows.slug, NEW_ARRIVALS_ROW_SLUG)).limit(1);
  if (!row[0]) return null;

  const current = await db
    .select({ courseId: courseCatalogRows.courseId })
    .from(courseCatalogRows)
    .where(eq(courseCatalogRows.rowId, row[0].id))
    .orderBy(asc(courseCatalogRows.sortOrder));

  const ordered = [courseId, ...current.map(item => item.courseId).filter(id => id !== courseId)];
  return replaceStreamingCatalogRowCourses(row[0].id, ordered);
}

export async function toggleWishlist(userId: number, courseId: number) {
  const db = await readyDb();
  const existing = await db.select().from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.courseId, courseId))).limit(1);
  if (existing[0]) {
    await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
    return { wishlisted: false };
  }
  await db.insert(wishlists).values({ userId, courseId });
  return { wishlisted: true };
}

export async function updateCourseProgress(userId: number, courseId: number, progressPercent: number, lastPositionSeconds: number) {
  const db = await readyDb();
  const [subscription, team] = await Promise.all([activeSubscription(db, userId), getTeamForMember(userId)]);
  if (!subscription && !team) throw new Error("サブスクリプションまたは有効なチームへの所属が必要です。");
  const normalized = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const existing = await db.select().from(viewingProgress).where(and(eq(viewingProgress.userId, userId), eq(viewingProgress.courseId, courseId))).limit(1);
  const previousPosition = existing[0]?.lastPositionSeconds ?? 0;
  const watchedSeconds = Math.max(0, Math.round(lastPositionSeconds) - previousPosition);
  const completedNow = normalized >= 100 && !existing[0]?.completed;
  if (existing[0]) {
    await db.update(viewingProgress).set({ progressPercent: normalized, lastPositionSeconds, completed: normalized >= 100 }).where(eq(viewingProgress.id, existing[0].id));
  } else {
    await db.insert(viewingProgress).values({ userId, courseId, progressPercent: normalized, lastPositionSeconds, completed: normalized >= 100 });
  }
  if (watchedSeconds > 0 || completedNow) {
    await db.insert(learningActivities).values({ userId, courseId, watchedSeconds, completed: completedNow });
  }
  return { progressPercent: normalized };
}

export async function getUserLibrary(userId: number) {
  const db = await readyDb();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const [wishlistRows, progressRows, subscription, catalogRows, activityRows, learningGoalRows, team] = await Promise.all([
    db.select({ ...courseSelect, savedAt: wishlists.createdAt }).from(wishlists).innerJoin(courses, eq(wishlists.courseId, courses.id)).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(wishlists.userId, userId)).orderBy(desc(wishlists.createdAt)),
    db.select({ ...courseSelect, progressPercent: viewingProgress.progressPercent, lastPositionSeconds: viewingProgress.lastPositionSeconds, completed: viewingProgress.completed, updatedAt: viewingProgress.updatedAt }).from(viewingProgress).innerJoin(courses, eq(viewingProgress.courseId, courses.id)).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(viewingProgress.userId, userId)).orderBy(desc(viewingProgress.updatedAt)),
    subscriptionByUser(db, userId),
    db.select(courseSelect).from(courses).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).orderBy(desc(courses.publishedAt)),
    db.select({ courseId: learningActivities.courseId, recordedAt: learningActivities.recordedAt, watchedSeconds: learningActivities.watchedSeconds, completed: learningActivities.completed }).from(learningActivities).where(and(eq(learningActivities.userId, userId), gte(learningActivities.recordedAt, sixMonthsAgo))),
    getLearningGoals(userId),
    getTeamForMember(userId),
  ]);
  const individualAccess = subscriptionAccessState(subscription);
  const access = { ...individualAccess, subscribed: individualAccess.subscribed || Boolean(team) };
  const monthlyLearning = buildMonthlyLearningReport(mergeHistoricalProgressForReport(activityRows, progressRows.map(progress => ({ courseId: progress.id, durationMinutes: progress.durationMinutes, progressPercent: progress.progressPercent, completed: progress.completed, updatedAt: progress.updatedAt }))));
  const savedCourseIds = new Set(wishlistRows.map(course => course.id));
  const progressByWishlistCourse = new Map(progressRows.map(progress => [progress.id, progress]));
  const wishlist = wishlistRows.map(course => {
    const progress = progressByWishlistCourse.get(course.id);
    return {
      ...course,
      progressPercent: progress?.progressPercent ?? 0,
      completed: progress?.completed ?? false,
    };
  });
  const recommendations = access.subscribed ? buildRecommendations(catalogRows, progressRows.map(progress => ({ id: progress.id, progressPercent: progress.progressPercent, completed: progress.completed })), 3, learningGoalRows.map(item => item.goal)).map(recommendation => ({ ...recommendation, wishlisted: savedCourseIds.has(recommendation.course.id) })) : [];
  return { wishlist, progress: progressRows, availableCourses: access.subscribed ? catalogRows : [], recommendations, learningGoals: learningGoalRows, learningReport: monthlyLearning, ...access, monthlyPrice: SUBSCRIPTION_PRICE_YEN, subscription, team };
}
