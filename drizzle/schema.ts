/**
 * Cloudflare D1 (SQLite) schema.
 *
 * Ported from the original MySQL schema (see `_manus-legacy/schema.mysql.ts`).
 * Column names, table names and semantics are kept identical so that the
 * application code and the client stay source-compatible.
 *
 * SQLite mapping rules used here:
 *   int autoincrement pk -> integer().primaryKey({ autoIncrement: true })
 *   varchar / text       -> text()
 *   boolean              -> integer({ mode: "boolean" })
 *   timestamp            -> integer({ mode: "timestamp" })
 *   mysqlEnum            -> text({ enum: [...] })
 *   defaultNow()         -> .default(sql`(unixepoch())`)
 *   onUpdateNow()        -> .$onUpdate(() => new Date())
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const now = () => sql`(unixepoch())`;

const SUBSCRIPTION_STATUS = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  stripeCustomerId: text("stripeCustomerId").unique(),
  /** Current entitlement summary. Stripe subscription events update these fields. */
  plan: text("plan", { enum: ["free", "standard", "premium"] }).default("free").notNull(),
  subscriptionStatus: text("subscriptionStatus", { enum: SUBSCRIPTION_STATUS }).default("incomplete").notNull(),
  currentPeriodEnd: integer("currentPeriodEnd", { mode: "timestamp" }),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(now()).notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  /** Webhook-managed entitlement cache; Stripe remains the billing source of truth. */
  status: text("status", { enum: SUBSCRIPTION_STATUS }).default("incomplete").notNull(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  /** Last accepted Stripe event timestamp, retained only to reject stale event writes. */
  stripeEventCreatedAt: integer("stripeEventCreatedAt", { mode: "timestamp" }),
  currentPeriodEnd: integer("currentPeriodEnd", { mode: "timestamp" }),
  cancelAtPeriodEnd: integer("cancelAtPeriodEnd", { mode: "boolean" }).default(false).notNull(),
  plan: text("plan", { enum: ["standard"] }).default("standard").notNull(),
  monthlyPrice: integer("monthlyPrice").default(980).notNull(),
  startedAt: integer("startedAt", { mode: "timestamp" }).default(now()).notNull(),
  renewedAt: integer("renewedAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("subscription_user_unique").on(table.userId)]);

/** Organization subscription contract created by the Stripe team-plan webhook. */
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamName: text("teamName").notNull(),
  adminEmail: text("adminEmail").notNull(),
  stripeCustomerId: text("stripeCustomerId").notNull(),
  stripeSubscriptionId: text("stripeSubscriptionId").notNull().unique(),
  seatCount: integer("seatCount").notNull(),
  accessCode: text("accessCode").notNull().unique(),
  status: text("status", { enum: ["active", "canceled"] }).default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [
  index("team_admin_email_idx").on(table.adminEmail),
  uniqueIndex("team_stripe_customer_unique").on(table.stripeCustomerId),
]);

/** A learner can join only one active organization at a time. */
export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("teamId").notNull().references(() => teams.id),
  userId: integer("userId").notNull().references(() => users.id),
  joinedAt: integer("joinedAt", { mode: "timestamp" }).default(now()).notNull(),
}, table => [
  uniqueIndex("team_member_team_user_unique").on(table.teamId, table.userId),
  uniqueIndex("team_member_user_unique").on(table.userId),
  index("team_member_team_idx").on(table.teamId),
]);

/** Persistent rate-limit counter for team-code attempts per signed-in learner. */
export const teamCodeAttempts = sqliteTable("team_code_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id).unique(),
  attemptCount: integer("attemptCount").default(0).notNull(),
  windowStartedAt: integer("windowStartedAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
});

/** Curated shelves displayed in the streaming-style catalog. */
export const catalogRows = sqliteTable("catalog_rows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
});

export const doctors = sqliteTable("doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  profile: text("profile").notNull(),
  affiliation: text("affiliation").notNull(),
  initials: text("initials").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
});

export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  categoryId: integer("categoryId").notNull().references(() => categories.id),
  doctorId: integer("doctorId").notNull().references(() => doctors.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  intendedFor: text("intendedFor").notNull(),
  learningPoints: text("learningPoints").notNull(),
  referencesText: text("referencesText").notNull(),
  coiText: text("coiText").notNull(),
  price: integer("price").notNull(),
  durationMinutes: integer("durationMinutes").notNull(),
  publishedAt: integer("publishedAt", { mode: "timestamp" }).notNull(),
  reviewedAt: integer("reviewedAt", { mode: "timestamp" }).notNull(),
  thumbnailTheme: text("thumbnailTheme").default("cyan").notNull(),
  previewLabel: text("previewLabel").notNull(),
  /** Vimeo video identifier. Kept empty until the owner configures a domain-restricted embed. */
  vimeoId: text("vimeoId"),
  /** 限定公開動画のハッシュ（vimeo.com/{id}/{hash}）。公開動画では null。 */
  vimeoHash: text("vimeoHash"),
  isFeatured: integer("isFeatured", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
});

/** A course can appear on any number of curated catalog rows. */
export const courseCatalogRows = sqliteTable("course_catalog_rows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rowId: integer("rowId").notNull().references(() => catalogRows.id),
  courseId: integer("courseId").notNull().references(() => courses.id),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [
  uniqueIndex("course_catalog_row_course_unique").on(table.rowId, table.courseId),
  uniqueIndex("course_catalog_row_sort_unique").on(table.rowId, table.sortOrder),
  index("course_catalog_row_row_idx").on(table.rowId),
  index("course_catalog_row_course_idx").on(table.courseId),
]);

/** Curated public-information links for a course; the API limits each course to three links. */
export const courseReferenceLinks = sqliteTable("course_reference_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("courseId").notNull().references(() => courses.id),
  label: text("label").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sortOrder").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [
  uniqueIndex("course_reference_link_course_sort_unique").on(table.courseId, table.sortOrder),
  index("course_reference_link_course_idx").on(table.courseId),
]);

export const wishlists = sqliteTable("wishlists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  courseId: integer("courseId").notNull().references(() => courses.id),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
}, table => [uniqueIndex("wishlist_user_course_unique").on(table.userId, table.courseId)]);

export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  courseId: integer("courseId").notNull().references(() => courses.id),
  priceAtPurchase: integer("priceAtPurchase").notNull(),
  status: text("status", { enum: ["purchased"] }).default("purchased").notNull(),
  purchasedAt: integer("purchasedAt", { mode: "timestamp" }).default(now()).notNull(),
}, table => [uniqueIndex("purchase_user_course_unique").on(table.userId, table.courseId)]);

export const viewingProgress = sqliteTable("viewingProgress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  courseId: integer("courseId").notNull().references(() => courses.id),
  progressPercent: integer("progressPercent").default(0).notNull(),
  lastPositionSeconds: integer("lastPositionSeconds").default(0).notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("progress_user_course_unique").on(table.userId, table.courseId)]);

/** Immutable playback-save events used only for a learner's own monthly report. */
export const learningActivities = sqliteTable("learningActivities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  courseId: integer("courseId").notNull().references(() => courses.id),
  watchedSeconds: integer("watchedSeconds").default(0).notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  recordedAt: integer("recordedAt", { mode: "timestamp" }).default(now()).notNull(),
}, table => [index("learning_activity_user_recorded_idx").on(table.userId, table.recordedAt)]);

/** One learner-selected educational focus; this is not medical profile data or a clinical goal. */
export const learningGoals = sqliteTable("learningGoals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  goal: text("goal", { enum: ["understand_glp1", "improve_lifestyle", "understand_checks", "prepare_for_visit"] }).notNull(),
  /** Lower numbers indicate higher learner-selected recommendation priority. */
  priority: integer("priority").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(now()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(now()).$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("learning_goal_user_goal_unique").on(table.userId, table.goal)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CatalogRow = typeof catalogRows.$inferSelect;
export type CourseCatalogRow = typeof courseCatalogRows.$inferSelect;
export type CourseReferenceLink = typeof courseReferenceLinks.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
