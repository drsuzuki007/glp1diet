import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  /** Webhook-managed entitlement cache; Stripe remains the billing source of truth. */
  status: mysqlEnum("status", ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]).default("incomplete").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  /** Last accepted Stripe event timestamp, retained only to reject stale event writes. */
  stripeEventCreatedAt: timestamp("stripeEventCreatedAt"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  monthlyPrice: int("monthlyPrice").default(980).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  renewedAt: timestamp("renewedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("subscription_user_unique").on(table.userId)]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  specialty: varchar("specialty", { length: 120 }).notNull(),
  profile: text("profile").notNull(),
  affiliation: varchar("affiliation", { length: 160 }).notNull(),
  initials: varchar("initials", { length: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  categoryId: int("categoryId").notNull().references(() => categories.id),
  doctorId: int("doctorId").notNull().references(() => doctors.id),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  intendedFor: text("intendedFor").notNull(),
  learningPoints: text("learningPoints").notNull(),
  referencesText: text("referencesText").notNull(),
  coiText: text("coiText").notNull(),
  price: int("price").notNull(),
  durationMinutes: int("durationMinutes").notNull(),
  publishedAt: timestamp("publishedAt").notNull(),
  reviewedAt: timestamp("reviewedAt").notNull(),
  thumbnailTheme: varchar("thumbnailTheme", { length: 32 }).default("cyan").notNull(),
  previewLabel: varchar("previewLabel", { length: 120 }).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const wishlists = mysqlTable("wishlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  courseId: int("courseId").notNull().references(() => courses.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("wishlist_user_course_unique").on(table.userId, table.courseId)]);

export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  courseId: int("courseId").notNull().references(() => courses.id),
  priceAtPurchase: int("priceAtPurchase").notNull(),
  status: mysqlEnum("status", ["purchased"]).default("purchased").notNull(),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
}, table => [uniqueIndex("purchase_user_course_unique").on(table.userId, table.courseId)]);

export const viewingProgress = mysqlTable("viewingProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  courseId: int("courseId").notNull().references(() => courses.id),
  progressPercent: int("progressPercent").default(0).notNull(),
  lastPositionSeconds: int("lastPositionSeconds").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("progress_user_course_unique").on(table.userId, table.courseId)]);

/** Immutable playback-save events used only for a learner's own monthly report. */
export const learningActivities = mysqlTable("learningActivities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  courseId: int("courseId").notNull().references(() => courses.id),
  watchedSeconds: int("watchedSeconds").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, table => [index("learning_activity_user_recorded_idx").on(table.userId, table.recordedAt)]);

/** One learner-selected educational focus; this is not medical profile data or a clinical goal. */
export const learningGoals = mysqlTable("learningGoals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  goal: mysqlEnum("goal", ["understand_glp1", "improve_lifestyle", "understand_checks", "prepare_for_visit"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("learning_goal_user_goal_unique").on(table.userId, table.goal)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
