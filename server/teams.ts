import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { teamCodeAttempts, teamMembers, teams, users } from "../drizzle/schema";
import { getDb, getUserById } from "./db";

const TEAM_CODE_ATTEMPT_LIMIT = 5;
const TEAM_CODE_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type TeamDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function readyTeamDb(): Promise<TeamDatabase> {
  const db = await getDb();
  if (!db) throw new Error("データベースに接続できませんでした。");
  return db;
}

function normalizeTeamCode(accessCode: string) {
  return accessCode.trim().toUpperCase();
}

function createAccessCode() {
  const chunk = () => randomBytes(3).toString("hex").slice(0, 4).toUpperCase();
  return `TEAM-${chunk()}-${chunk()}`;
}

async function activeTeamMembership(db: TeamDatabase, userId: number) {
  const result = await db.select({
    membershipId: teamMembers.id,
    teamId: teams.id,
    teamName: teams.teamName,
    seatCount: teams.seatCount,
    accessCode: teams.accessCode,
    status: teams.status,
    joinedAt: teamMembers.joinedAt,
  }).from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(and(eq(teamMembers.userId, userId), eq(teams.status, "active")))
    .limit(1);
  return result[0] ?? null;
}

async function nextTeamAccessCode(db: TeamDatabase) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const accessCode = createAccessCode();
    const existing = await db.select({ id: teams.id }).from(teams).where(eq(teams.accessCode, accessCode)).limit(1);
    if (!existing[0]) return accessCode;
  }
  throw new Error("チームコードを発行できませんでした。再度お試しください。");
}

export async function upsertTeamFromStripe(input: {
  teamName?: string | null;
  adminEmail: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  seatCount: number;
  status?: "active" | "canceled";
}) {
  const db = await readyTeamDb();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  if (!adminEmail) throw new Error("チーム管理者のメールアドレスを確認できませんでした。");
  const seatCount = Math.max(1, Math.min(999, Math.floor(input.seatCount || 1)));
  const existing = await db.select().from(teams).where(eq(teams.stripeSubscriptionId, input.stripeSubscriptionId)).limit(1);
  if (existing[0]) {
    await db.update(teams).set({
      teamName: input.teamName?.trim() || existing[0].teamName,
      adminEmail,
      stripeCustomerId: input.stripeCustomerId,
      seatCount,
      status: input.status ?? "active",
    }).where(eq(teams.id, existing[0].id));
    return (await db.select().from(teams).where(eq(teams.id, existing[0].id)).limit(1))[0]!;
  }
  const accessCode = await nextTeamAccessCode(db);
  await db.insert(teams).values({
    teamName: input.teamName?.trim() || "glp1.diet チームプラン",
    adminEmail,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    seatCount,
    accessCode,
    status: input.status ?? "active",
  });
  return (await db.select().from(teams).where(eq(teams.stripeSubscriptionId, input.stripeSubscriptionId)).limit(1))[0]!;
}

export async function syncTeamSubscription(input: { stripeSubscriptionId: string; seatCount: number; status: "active" | "canceled" }) {
  const db = await readyTeamDb();
  const existing = await db.select().from(teams).where(eq(teams.stripeSubscriptionId, input.stripeSubscriptionId)).limit(1);
  if (!existing[0]) return null;
  await db.update(teams).set({
    seatCount: Math.max(1, Math.min(999, Math.floor(input.seatCount || 1))),
    status: input.status,
  }).where(eq(teams.id, existing[0].id));
  return (await db.select().from(teams).where(eq(teams.id, existing[0].id)).limit(1))[0]!;
}

export async function getTeamForMember(userId: number) {
  return activeTeamMembership(await readyTeamDb(), userId);
}

export async function joinTeamWithAccessCode(userId: number, inputCode: string) {
  const db = await readyTeamDb();
  const now = new Date();
  const prior = (await db.select().from(teamCodeAttempts).where(eq(teamCodeAttempts.userId, userId)).limit(1))[0];
  const withinWindow = prior && now.getTime() - prior.windowStartedAt.getTime() < TEAM_CODE_ATTEMPT_WINDOW_MS;
  const attempts = withinWindow ? prior!.attemptCount : 0;
  if (attempts >= TEAM_CODE_ATTEMPT_LIMIT) throw new Error("チームコードの試行回数が上限に達しました。15分後に再度お試しください。");
  if (prior) {
    await db.update(teamCodeAttempts).set({ attemptCount: attempts + 1, windowStartedAt: withinWindow ? prior.windowStartedAt : now }).where(eq(teamCodeAttempts.id, prior.id));
  } else {
    await db.insert(teamCodeAttempts).values({ userId, attemptCount: 1, windowStartedAt: now });
  }

  const team = (await db.select().from(teams).where(eq(teams.accessCode, normalizeTeamCode(inputCode))).limit(1))[0];
  if (!team || team.status !== "active") throw new Error("有効なチームコードではありません。管理者にお問い合わせください。");
  const current = (await db.select().from(teamMembers).where(eq(teamMembers.userId, userId)).limit(1))[0];
  if (current) {
    if (current.teamId === team.id) return activeTeamMembership(db, userId);
    throw new Error("このアカウントは別のチームに所属しています。変更は管理者にお問い合わせください。");
  }
  const members = await db.select({ id: teamMembers.id }).from(teamMembers).where(eq(teamMembers.teamId, team.id));
  if (members.length >= team.seatCount) throw new Error("このチームの契約人数の上限に達しています。管理者にお問い合わせください。");
  await db.insert(teamMembers).values({ teamId: team.id, userId });
  await db.update(teamCodeAttempts).set({ attemptCount: 0, windowStartedAt: now }).where(eq(teamCodeAttempts.userId, userId));
  return activeTeamMembership(db, userId);
}

export async function getTeamAdminDashboard(userId: number) {
  const db = await readyTeamDb();
  const user = await getUserById(userId);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const team = (await db.select().from(teams).where(eq(teams.adminEmail, email)).limit(1))[0];
  if (!team) return null;
  const members = await db.select({
    id: teamMembers.id,
    userId: users.id,
    name: users.name,
    email: users.email,
    joinedAt: teamMembers.joinedAt,
  }).from(teamMembers).innerJoin(users, eq(teamMembers.userId, users.id)).where(eq(teamMembers.teamId, team.id)).orderBy(asc(teamMembers.joinedAt));
  return { team, members };
}

export async function removeTeamMemberByAdmin(input: { adminUserId: number; memberId: number }) {
  const dashboard = await getTeamAdminDashboard(input.adminUserId);
  if (!dashboard) throw new Error("チーム管理者のみがメンバーを削除できます。");
  const member = dashboard.members.find(item => item.id === input.memberId);
  if (!member) throw new Error("対象メンバーが見つかりません。");
  const db = await readyTeamDb();
  await db.delete(teamMembers).where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, dashboard.team.id)));
  return getTeamAdminDashboard(input.adminUserId);
}

export function teamCodeAttemptConfig() {
  return { maxAttempts: TEAM_CODE_ATTEMPT_LIMIT, windowMinutes: TEAM_CODE_ATTEMPT_WINDOW_MS / 60_000 };
}
