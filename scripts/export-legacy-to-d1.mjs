#!/usr/bin/env node
/**
 * 旧 Manus 版 (MySQL/TiDB) から Cloudflare D1 用の SQL を書き出す。
 *
 * **このスクリプトは旧 Manus プロジェクトの中で実行する。**
 * DATABASE_URL は Manus が自動注入する機密情報なので、外に持ち出さずに
 * その環境の中で読み、出力するのは「移行用 SQL ファイル」だけにする。
 * 接続文字列は一切表示しない（ホスト名も伏せる）。
 *
 *   node scripts/export-legacy-to-d1.mjs --email drsuzuki007@gmail.com
 *   node scripts/export-legacy-to-d1.mjs --all
 *   node scripts/export-legacy-to-d1.mjs --email you@example.com --out my-data.sql
 *
 * 生成される SQL の考え方:
 *   - courses / categories / doctors などのカタログは **移行しない**。
 *     新環境では server/seed.ts が同じ内容を自動投入するため。
 *   - そのぶん講座の id は新旧で一致しない可能性があるので、視聴履歴などは
 *     id ではなく **slug で解決する** INSERT ... SELECT にしてある。
 *   - ユーザー行は旧 openId のまま入れる。新環境で初回 Google ログインしたとき、
 *     メール一致で openId が自動的に書き換わる（relinkLegacyOpenIdByEmail）。
 */
import { writeFile } from "node:fs/promises";

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const args = { email: null, all: false, out: "legacy-d1.sql" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") args.all = true;
    else if (arg === "--email") args.email = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.all && !args.email)) {
  console.log(`使い方:
  node scripts/export-legacy-to-d1.mjs --email <アドレス>   1人分だけ書き出す
  node scripts/export-legacy-to-d1.mjs --all                全ユーザーを書き出す
  オプション: --out <ファイル名>  (既定: legacy-d1.sql)`);
  process.exit(args.help ? 0 : 1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL が見つかりません。このスクリプトは旧 Manus プロジェクトの中で実行してください。"
  );
  process.exit(1);
}

// ---------------------------------------------------------------- SQL literals

/** SQLite のリテラルに変換する。日時は Unix 秒、真偽値は 0/1。 */
function lit(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return String(Math.floor(value.getTime() / 1000));
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Buffer.isBuffer(value)) return value[0] ? "1" : "0"; // MySQL の BIT/TINYINT(1)
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** 対象ユーザーを email で特定する副問い合わせ。id は新旧で変わりうるので使わない。 */
const userIdByEmail = email => `(SELECT id FROM users WHERE lower(email) = ${lit(email.toLowerCase())})`;

// ---------------------------------------------------------------- main

const out = [];
const counts = {};

function section(title) {
  out.push("", `-- ${"-".repeat(70)}`, `-- ${title}`, `-- ${"-".repeat(70)}`);
}

function bump(table, n = 1) {
  counts[table] = (counts[table] ?? 0) + n;
}

async function main() {
  // mysql2 は旧 Manus プロジェクトの依存。実行時に読み込むので --help はどこでも動く。
  let createConnection;
  try {
    ({ createConnection } = await import("mysql2/promise"));
  } catch {
    console.error(
      "mysql2 が見つかりません。このスクリプトは旧 Manus プロジェクト（mysql2 が入っている環境）で実行してください。"
    );
    process.exit(1);
  }

  // timezone: "Z" … DATETIME を UTC として解釈させる（時刻がずれないように）
  const db = await createConnection({ uri: DATABASE_URL, timezone: "Z" });

  const where = args.all ? "" : "WHERE lower(u.email) = ?";
  const params = args.all ? [] : [args.email.toLowerCase()];

  const [users] = await db.execute(
    `SELECT u.* FROM users u ${where} ORDER BY u.id`,
    params
  );

  if (users.length === 0) {
    console.error(
      args.all ? "users テーブルが空です。" : `${args.email} に一致するユーザーがいません。`
    );
    await db.end();
    process.exit(1);
  }

  out.push(
    "-- glp1.diet 移行データ (旧 MySQL -> Cloudflare D1)",
    `-- 生成日時: ${new Date().toISOString()}`,
    `-- 対象: ${args.all ? "全ユーザー" : args.email}`,
    "--",
    "-- 実行前に: (1) npm run db:migrate:local  (2) npm run dev でトップページを一度開く",
    "--           ※ (2) で講座カタログが自動投入される。ログインはこの SQL を入れた後に。",
    "-- 実行:     npx wrangler d1 execute glp1diet-db --local --file=./legacy-d1.sql"
  );

  section("users");
  for (const u of users) {
    const cols = [
      "openId", "name", "email", "stripeCustomerId", "plan", "subscriptionStatus",
      "currentPeriodEnd", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn",
    ];
    const values = cols.map(c => lit(u[c])).join(", ");
    out.push(
      `INSERT INTO users (${cols.join(", ")}) VALUES (${values})`,
      `  ON CONFLICT(openId) DO UPDATE SET` ,
      `    name = excluded.name, email = excluded.email,`,
      `    stripeCustomerId = excluded.stripeCustomerId, plan = excluded.plan,`,
      `    subscriptionStatus = excluded.subscriptionStatus,`,
      `    currentPeriodEnd = excluded.currentPeriodEnd, role = excluded.role;`
    );
    bump("users");
  }

  for (const u of users) {
    const uid = userIdByEmail(u.email ?? "");
    if (!u.email) {
      out.push("", `-- ⚠ user #${u.id} (${u.openId}) はメール未登録のため関連データを省略`);
      continue;
    }

    // ---- subscriptions -------------------------------------------------
    const [subs] = await db.execute("SELECT * FROM subscriptions WHERE userId = ?", [u.id]);
    if (subs.length) section(`subscriptions (${u.email})`);
    for (const s of subs) {
      out.push(
        `INSERT INTO subscriptions (userId, status, stripeSubscriptionId, stripeEventCreatedAt,`,
        `  currentPeriodEnd, cancelAtPeriodEnd, plan, monthlyPrice, startedAt, renewedAt)`,
        `SELECT ${uid}, ${lit(s.status)}, ${lit(s.stripeSubscriptionId)}, ${lit(s.stripeEventCreatedAt)},`,
        `  ${lit(s.currentPeriodEnd)}, ${lit(s.cancelAtPeriodEnd)}, ${lit(s.plan)}, ${lit(s.monthlyPrice)},`,
        `  ${lit(s.startedAt)}, ${lit(s.renewedAt)}`,
        `WHERE ${uid} IS NOT NULL`,
        `  ON CONFLICT(userId) DO UPDATE SET`,
        `    status = excluded.status, stripeSubscriptionId = excluded.stripeSubscriptionId,`,
        `    currentPeriodEnd = excluded.currentPeriodEnd, cancelAtPeriodEnd = excluded.cancelAtPeriodEnd;`
      );
      bump("subscriptions");
    }

    // ---- wishlists (講座は slug で解決) --------------------------------
    const [wishlist] = await db.execute(
      `SELECT c.slug, w.createdAt FROM wishlists w
         JOIN courses c ON c.id = w.courseId
        WHERE w.userId = ? ORDER BY w.createdAt`,
      [u.id]
    );
    if (wishlist.length) section(`wishlists (${u.email}) — ${wishlist.length}件`);
    for (const w of wishlist) {
      out.push(
        `INSERT OR IGNORE INTO wishlists (userId, courseId, createdAt)`,
        `SELECT u.id, c.id, ${lit(w.createdAt)} FROM users u, courses c`,
        `  WHERE lower(u.email) = ${lit(u.email.toLowerCase())} AND c.slug = ${lit(w.slug)};`
      );
      bump("wishlists");
    }

    // ---- viewingProgress -----------------------------------------------
    const [progress] = await db.execute(
      `SELECT c.slug, p.progressPercent, p.lastPositionSeconds, p.completed, p.updatedAt
         FROM viewingProgress p JOIN courses c ON c.id = p.courseId
        WHERE p.userId = ? ORDER BY p.updatedAt`,
      [u.id]
    );
    if (progress.length) section(`viewingProgress (${u.email}) — ${progress.length}件`);
    for (const p of progress) {
      out.push(
        `INSERT OR IGNORE INTO viewingProgress (userId, courseId, progressPercent, lastPositionSeconds, completed, updatedAt)`,
        `SELECT u.id, c.id, ${lit(p.progressPercent)}, ${lit(p.lastPositionSeconds)}, ${lit(p.completed)}, ${lit(p.updatedAt)}`,
        `  FROM users u, courses c`,
        `  WHERE lower(u.email) = ${lit(u.email.toLowerCase())} AND c.slug = ${lit(p.slug)};`
      );
      bump("viewingProgress");
    }

    // ---- learningActivities ---------------------------------------------
    const [activities] = await db.execute(
      `SELECT c.slug, a.watchedSeconds, a.completed, a.recordedAt
         FROM learningActivities a JOIN courses c ON c.id = a.courseId
        WHERE a.userId = ? ORDER BY a.recordedAt`,
      [u.id]
    );
    if (activities.length) section(`learningActivities (${u.email}) — ${activities.length}件`);
    for (const a of activities) {
      // learningActivities には一意制約がないので、二重実行で重複しないよう NOT EXISTS で守る
      out.push(
        `INSERT INTO learningActivities (userId, courseId, watchedSeconds, completed, recordedAt)`,
        `SELECT u.id, c.id, ${lit(a.watchedSeconds)}, ${lit(a.completed)}, ${lit(a.recordedAt)}`,
        `  FROM users u, courses c`,
        `  WHERE lower(u.email) = ${lit(u.email.toLowerCase())} AND c.slug = ${lit(a.slug)}`,
        `    AND NOT EXISTS (SELECT 1 FROM learningActivities la`,
        `      WHERE la.userId = u.id AND la.courseId = c.id AND la.recordedAt = ${lit(a.recordedAt)});`
      );
      bump("learningActivities");
    }

    // ---- learningGoals ---------------------------------------------------
    const [goals] = await db.execute(
      "SELECT goal, priority, createdAt FROM learningGoals WHERE userId = ? ORDER BY priority",
      [u.id]
    );
    if (goals.length) section(`learningGoals (${u.email}) — ${goals.length}件`);
    for (const g of goals) {
      out.push(
        `INSERT OR IGNORE INTO learningGoals (userId, goal, priority, createdAt)`,
        `SELECT ${uid}, ${lit(g.goal)}, ${lit(g.priority)}, ${lit(g.createdAt)}`,
        `  WHERE ${uid} IS NOT NULL;`
      );
      bump("learningGoals");
    }
  }

  // ---- teams (チームプラン契約がある場合のみ) ----------------------------
  const [teams] = await db.execute("SELECT * FROM teams");
  if (teams.length) {
    section("teams / team_members");
    for (const t of teams) {
      out.push(
        `INSERT OR IGNORE INTO teams (teamName, adminEmail, stripeCustomerId, stripeSubscriptionId,`,
        `  seatCount, accessCode, status, createdAt, updatedAt)`,
        `VALUES (${lit(t.teamName)}, ${lit(t.adminEmail)}, ${lit(t.stripeCustomerId)},`,
        `  ${lit(t.stripeSubscriptionId)}, ${lit(t.seatCount)}, ${lit(t.accessCode)}, ${lit(t.status)},`,
        `  ${lit(t.createdAt)}, ${lit(t.updatedAt)});`
      );
      bump("teams");

      const [members] = await db.execute(
        `SELECT u.email, m.joinedAt FROM team_members m JOIN users u ON u.id = m.userId WHERE m.teamId = ?`,
        [t.id]
      );
      for (const m of members) {
        if (!m.email) continue;
        if (!args.all && m.email.toLowerCase() !== args.email.toLowerCase()) continue;
        out.push(
          `INSERT OR IGNORE INTO team_members (teamId, userId, joinedAt)`,
          `SELECT t.id, u.id, ${lit(m.joinedAt)} FROM teams t, users u`,
          `  WHERE t.stripeSubscriptionId = ${lit(t.stripeSubscriptionId)}`,
          `    AND lower(u.email) = ${lit(m.email.toLowerCase())};`
        );
        bump("team_members");
      }
    }
  }

  await db.end();

  await writeFile(args.out, out.join("\n") + "\n", "utf8");

  console.log(`\n✅ ${args.out} を書き出しました\n`);
  for (const [table, n] of Object.entries(counts)) console.log(`   ${table.padEnd(20)} ${n} 件`);
  console.log(`
次の手順:
  1. ${args.out} をダウンロードして、新プロジェクト (glp1diet-cf) の直下に置く
  2. npm run db:migrate:local
  3. npm run dev を起動し、ブラウザでトップページを一度開く（講座カタログが自動投入される）
     ※ ログインはまだしない
  4. npx wrangler d1 execute glp1diet-db --local --file=./${args.out}
  5. Google でログイン → メール一致で openId が自動的に引き継がれる
`);
}

main().catch(error => {
  // 接続文字列が例外メッセージに混ざることがあるので、URL らしき部分は伏せる
  const safe = String(error?.stack ?? error).replace(/mysql:\/\/[^\s'"]+/gi, "mysql://***");
  console.error("エクスポートに失敗しました:\n" + safe);
  process.exit(1);
});
