# CLAUDE.md — glp1.diet (Cloudflare Workers)

医師制作・監修の医療教育動画サブスクリプション。Manus / Express / MySQL 版から
Cloudflare Workers + D1 + R2 へ移行したもの。移行の対応表は `docs/MIGRATION.md`。

## アーキテクチャ（3行で）

- **サーバーは Worker ひとつだけ**。`worker/index.ts` の `fetch` がすべての入口。Express も Node プロセスも存在しない。
- **API は tRPC**。ルーター定義は `server/routers.ts`、ドメインロジックは `server/*.ts`。ここは移行前とほぼ同じコードで、Express 依存だけが剥がしてある。
- **クライアントは React + Vite の SPA**。`client/src/`。ビルド成果物は Worker の `ASSETS` バインディングから配信される。

```
worker/          Cloudflare 固有の層（ここだけが Workers を知っている）
  index.ts       ルートテーブル。新しいエンドポイントはここに足す
  runtime.ts     ★重要: リクエストごとの env / DB を AsyncLocalStorage で保持
  env.ts         バインディングと設定の型。新しい設定はまずここに足す
  http.ts        Express 風 req/res シム（server/ の既存コードを動かすため）
  html.ts        index.html への SEO メタデータ差し込み
  media.ts       /manus-storage/* → R2
  stripeWebhook.ts
  auth/          Google OAuth（google.ts = Google 通信、routes.ts = エンドポイント）
server/          ドメインロジック。Cloudflare を直接知らない
  routers.ts     tRPC ルーター定義（API の全体像はここを見る）
  db.ts          Drizzle クエリ集
  stripe.ts teams.ts seed.ts products.ts courseMetadata.ts
  _core/         env / cookies / session / auth / trpc / context
  *.test.ts      Vitest
shared/          クライアントとサーバーで共有する純粋ロジック
drizzle/         schema.ts（D1/SQLite）と migrations/
client/src/      React アプリ
docs/legacy-manus/  移行前の Manus 版ファイル（参照用。ビルド対象外）
```

## コマンド

```bash
npm install
cp .dev.vars.example .dev.vars   # 秘密情報を記入（初回のみ）
npm run db:migrate:local         # ローカル D1 にマイグレーション適用
npm run dev                      # http://localhost:5173 （Worker も同時に起動）

npm run check                    # tsc --noEmit
npm test                         # vitest
npm run build                    # dist/ を生成
npm run deploy                   # ビルドして wrangler deploy
npm run db:generate              # schema.ts を変更したらマイグレーション生成
```

## 変更するときの決まりごと

**設定・秘密情報を追加する**
1. `worker/env.ts` の `AppEnv` に型を足す
2. 公開値なら `wrangler.jsonc` の `vars`、秘密なら `.dev.vars.example` に足す
3. `server/_core/env.ts` に getter を足す（`ENV.xxx` として使う）
4. `process.env` は Worker には存在しない。**必ず `ENV` 経由で読む**

**エンドポイントを追加する**
- tRPC で足りるなら `server/routers.ts` に procedure を足すだけ（推奨）
- 生の HTTP が必要なら `worker/index.ts` の `route()` にパスを足す

**DB を変更する**
1. `drizzle/schema.ts` を編集
2. `npm run db:generate` → `drizzle/migrations/` に SQL が出る
3. `npm run db:migrate:local`（本番は `db:migrate:remote`）
- **D1 には対話的トランザクションがない。** `db.transaction()` は使えない。
  複数文をまとめるときは `server/db.ts` の `runBatch()`（`db.batch()`）を使う
- 日時カラムは `integer({ mode: "timestamp" })`。真偽値は `integer({ mode: "boolean" })`

**Workers で使えないもの**
- Node の同期 API（`fs`、同期 crypto）、TCP 接続（`mysql2` など）
- 1リクエストの CPU 時間には上限がある。重い処理は避けるか分割する
- `node:async_hooks` と `node:crypto` の一部は `nodejs_compat` 有効なので使える

**動画（Vimeo）**
- 講座と動画の対応は `courses.vimeoId` / `courses.vimeoHash`。管理画面（/admin/catalog）から登録する
- URL の解析・メタデータ取得・埋め込みURL生成は `server/vimeo.ts` に集約。Vimeo 側を
  「特定ドメインのみ埋め込み可」に変えるときも、コードの変更点は `buildEmbedUrl()` だけ
- **`vimeoId` を公開クエリ（`courseSelect`）に足さないこと。** 非会員に動画IDが漏れる。
  加入判定を通した `catalog.actions`（`entitledVideo()`）からのみ返す
- 非公開動画のメタデータ取得には `VIMEO_ACCESS_TOKEN` が必要（配信自体には不要。ドメイン制限の操作には edit 権限が要る）
- **埋め込みドメイン制限**: `VIMEO_EMBED_DOMAINS`（例 `glp1.diet,www.glp1.diet`）を設定すると、
  動画登録時に Vimeo 側を「指定ドメインのみ埋め込み可」へ自動で切り替える。既存の動画には
  管理画面の「登録済みの全動画に適用」から一括適用できる。設定・解除の実体は
  `server/vimeo.ts` の `restrictEmbedToDomains()` / `releaseEmbedRestriction()`
- **空のあいだは Vimeo の設定を一切触らない**（localhost / workers.dev でも再生できる）。
  glp1.diet への切り替えと同時に設定すること。切り戻しは管理画面の「制限を解除」

**認証**
- `worker/auth/` が Google OAuth。セッションは HS256 JWT を `app_session_id` cookie に保存
- tRPC の `protectedProcedure` / `adminProcedure` が認可を担当（`server/_core/trpc.ts`）
- 管理者は `OWNER_EMAIL`（推奨）または `OWNER_OPEN_ID` に一致するユーザー（`server/db.ts` の `isOwner`）
- 初回ログイン時、確認済みメールが一致する移行前の行があれば `openId` を引き継ぐ
  （`relinkLegacyOpenIdByEmail`）。旧データの書き出しは `scripts/export-legacy-to-d1.mjs`
  を旧 Manus プロジェクトの中で実行する。手順は `docs/DATA-MIGRATION.md`

## 落とし穴

- `server/_core/env.ts` の `ENV` は**getter の集まり**。モジュール先頭で分割代入しない（リクエスト外で評価されて空になる）
- `getDb()` はリクエスト外では `null` を返す。DB 必須の処理は `readyDb()` を使う
- カタログの初期データは初回クエリ時に `server/seed.ts` の `ensureCatalogSeed()` が投入する
- `index.html` の `__PAGE_TITLE__` などのプレースホルダは `worker/html.ts` が置換する。消さないこと
- `/manus-storage/` というパスは移行前の URL 互換のために残してある（中身は R2）
- `wrangler.jsonc` の `assets.run_worker_first: ["/*", "!/assets/*"]` を消さないこと。
  消すと静的アセット照合と SPA フォールバックが先に応答してしまい、`/` や `/pricing` は
  プレースホルダのままの HTML を返し、`/api/*` は HTML を返すようになる
