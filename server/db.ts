import { and, asc, desc, eq, gte, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categories, courses, doctors, InsertUser, purchases, users, viewingProgress, wishlists } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { ensureCatalogSeed } from "./seed";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type CourseFilters = {
  search?: string;
  category?: string;
  price?: "under1500" | "1500to3000" | "over3000";
  duration?: "under30" | "30to45" | "over45";
  doctor?: string;
  published?: "month" | "quarter" | "year";
  sort?: "newest" | "priceAsc" | "priceDesc" | "duration";
};

const courseSelect = {
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  summary: courses.summary,
  price: courses.price,
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

export async function listCourses(filters: CourseFilters = {}) {
  const db = await readyDb();
  const conditions = [];
  const keyword = filters.search?.trim();
  if (keyword) conditions.push(or(like(courses.title, `%${keyword}%`), like(courses.summary, `%${keyword}%`), like(categories.name, `%${keyword}%`), like(doctors.name, `%${keyword}%`))!);
  if (filters.category) conditions.push(eq(categories.slug, filters.category));
  if (filters.doctor) conditions.push(eq(doctors.slug, filters.doctor));
  if (filters.price === "under1500") conditions.push(lte(courses.price, 1499));
  if (filters.price === "1500to3000") conditions.push(and(gte(courses.price, 1500), lte(courses.price, 3000))!);
  if (filters.price === "over3000") conditions.push(gte(courses.price, 3001));
  if (filters.duration === "under30") conditions.push(lte(courses.durationMinutes, 29));
  if (filters.duration === "30to45") conditions.push(and(gte(courses.durationMinutes, 30), lte(courses.durationMinutes, 45))!);
  if (filters.duration === "over45") conditions.push(gte(courses.durationMinutes, 46));
  if (filters.published) {
    const days = filters.published === "month" ? 31 : filters.published === "quarter" ? 92 : 366;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    conditions.push(gte(courses.publishedAt, threshold));
  }
  const order = filters.sort === "priceAsc" ? asc(courses.price) : filters.sort === "priceDesc" ? desc(courses.price) : filters.sort === "duration" ? desc(courses.durationMinutes) : desc(courses.publishedAt);
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
  return result[0];
}

export async function getFeaturedCourse() {
  const db = await readyDb();
  const result = await db.select(courseSelect).from(courses).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(courses.isFeatured, true)).orderBy(desc(courses.publishedAt)).limit(1);
  return result[0];
}

export async function getCourseActions(userId: number, courseId: number) {
  const db = await readyDb();
  const [wishlistRows, purchaseRows, progressRows] = await Promise.all([
    db.select().from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.courseId, courseId))).limit(1),
    db.select().from(purchases).where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId))).limit(1),
    db.select().from(viewingProgress).where(and(eq(viewingProgress.userId, userId), eq(viewingProgress.courseId, courseId))).limit(1),
  ]);
  return { wishlisted: wishlistRows.length > 0, purchased: purchaseRows.length > 0, progress: progressRows[0] ?? null };
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

export async function purchaseCourse(userId: number, courseId: number) {
  const db = await readyDb();
  const course = await db.select({ price: courses.price }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course[0]) throw new Error("講座が見つかりません。");
  const existing = await db.select().from(purchases).where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId))).limit(1);
  if (existing[0]) return { alreadyPurchased: true };
  await db.insert(purchases).values({ userId, courseId, priceAtPurchase: course[0].price });
  return { alreadyPurchased: false };
}

export async function updateCourseProgress(userId: number, courseId: number, progressPercent: number, lastPositionSeconds: number) {
  const db = await readyDb();
  const normalized = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const existing = await db.select().from(viewingProgress).where(and(eq(viewingProgress.userId, userId), eq(viewingProgress.courseId, courseId))).limit(1);
  if (existing[0]) {
    await db.update(viewingProgress).set({ progressPercent: normalized, lastPositionSeconds, completed: normalized >= 100 }).where(eq(viewingProgress.id, existing[0].id));
  } else {
    await db.insert(viewingProgress).values({ userId, courseId, progressPercent: normalized, lastPositionSeconds, completed: normalized >= 100 });
  }
  return { progressPercent: normalized };
}

export async function getUserLibrary(userId: number) {
  const db = await readyDb();
  const wishlistRows = await db.select({ ...courseSelect, savedAt: wishlists.createdAt }).from(wishlists).innerJoin(courses, eq(wishlists.courseId, courses.id)).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).where(eq(wishlists.userId, userId)).orderBy(desc(wishlists.createdAt));
  const purchaseRows = await db.select({ ...courseSelect, purchasedAt: purchases.purchasedAt, priceAtPurchase: purchases.priceAtPurchase, progressPercent: viewingProgress.progressPercent, completed: viewingProgress.completed }).from(purchases).innerJoin(courses, eq(purchases.courseId, courses.id)).innerJoin(categories, eq(courses.categoryId, categories.id)).innerJoin(doctors, eq(courses.doctorId, doctors.id)).leftJoin(viewingProgress, and(eq(viewingProgress.courseId, courses.id), eq(viewingProgress.userId, purchases.userId))).where(eq(purchases.userId, userId)).orderBy(desc(purchases.purchasedAt));
  return { wishlist: wishlistRows, purchases: purchaseRows };
}
