# Manus/Express → Cloudflare Workers 移行メモ

移行元: `~/Documents/glp1diet`（Manus 製 Express + tRPC + Drizzle/MySQL + React/Vite）
移行先: このリポジトリ（Cloudflare Workers + D1 + R2 + 同じ React クライアント）

移行前のファイルは `docs/legacy-manus/` にそのまま残してある（ビルド対象外）。

## 対応表

| 項目 | 移行前 | 移行後 |
| --- | --- | --- |
| 実行環境 | Node + Express（`server/_core/index.ts`） | Cloudflare Worker（`worker/index.ts`） |
| API | tRPC Express アダプタ | tRPC fetch アダプタ |
| DB | MySQL（`mysql2` で TCP 接続） | Cloudflare D1（SQLite）+ `drizzle-orm/d1` |
| 設定 | `process.env` | Worker バインディング → `worker/runtime.ts` → `ENV` |
| 認証 | Manus OAuth（`server/_core/sdk.ts`） | Google OAuth（`worker/auth/`） |
| セッション | HS256 JWT を `app_session_id` cookie に保存 | **変更なし** |
| ファイル | Manus Forge 経由の署名付き S3 URL | R2 バケット（`MEDIA`） |
| Stripe | Node crypto で同期署名検証 | `constructEventAsync` + SubtleCrypto、fetch HTTP クライアント |
| 静的配信 | `express.static` + Vite middleware | Workers Assets（`ASSETS`）+ `vite dev` |
| SEO メタ | Express で index.html を書き換え | `worker/html.ts` で同じ置換を実施（**挙動同一**） |

## 互換性のために意図的に変えていないもの

- URL: `/api/trpc`、`/api/oauth/callback`、`/api/stripe/webhook`、`/manus-storage/*`、SPA の全ルート
- tRPC のルーター構造と入出力の型（クライアントは無改修で動く）
- セッション cookie 名（`app_session_id`）と JWT のクレーム構造
- DB のテーブル名・カラム名（MySQL 版と同一。方言だけ SQLite に変換）
- `index.html` の SEO プレースホルダと JSON-LD 構造

## 意図的に変えたもの

1. **ログイン方式**: Manus OAuth サーバーは Manus プラットフォーム外からは使えないため、
   Google OAuth に差し替えた。`openId` は `google:<sub>` という形式になる。
   → **既存ユーザーの `openId` は移行前と一致しない。** そのため初回ログイン時に
   確認済みメールアドレスで旧行を突き合わせて `openId` を書き換える仕組みを入れてある
   （`relinkLegacyOpenIdByEmail`）。手順は [docs/DATA-MIGRATION.md](./DATA-MIGRATION.md)。
2. **cookie の SameSite**: HTTPS では従来どおり `None; Secure`。プレーン HTTP
   （`localhost` での開発）では `Lax` に落とす（ブラウザが `None` を拒否するため）。
3. **トランザクション**: D1 に対話的トランザクションがないため、3か所を
   `db.batch()`（`server/db.ts` の `runBatch()`）に書き換えた。
   - `replaceCourseReferenceLinks`
   - `reorderStreamingCatalogRows`
   - `replaceStreamingCatalogRowCourses`
4. **`system.notifyOwner` を削除**: Manus の通知サービス依存。クライアントからの利用なし。
5. **静的配信の優先順位**: Workers Assets は既定で静的ファイルを Worker より先に返すため、
   `assets.run_worker_first` で `/assets/*` 以外を Worker 優先にしている。これがないと
   トップページの SEO メタデータが差し込まれず、API も HTML を返す。
6. **Manus 固有モジュールを削除**: `llm` / `map` / `imageGeneration` / `voiceTranscription` /
   `heartbeat` / `dataApi`、および未使用の Google Maps コンポーネント。
   いずれもアプリ本体から未参照だった（`docs/legacy-manus/` に退避）。

## セットアップ（ローカル）

```bash
npm install
cp .dev.vars.example .dev.vars       # 値を記入
npm run db:migrate:local
npm run dev                          # http://localhost:5173
```

Google OAuth クライアントの作成:
1. https://console.cloud.google.com/apis/credentials で「OAuth クライアント ID」を作成（種類: ウェブアプリケーション）
2. 承認済みリダイレクト URI に `http://localhost:5173/api/oauth/callback` と
   `https://<本番ドメイン>/api/oauth/callback` を登録
3. クライアント ID / シークレットを `.dev.vars` に記入

## 本番デプロイ時にやること（未実施）

```bash
npx wrangler login
npx wrangler d1 create glp1diet-db          # 出力の database_id を wrangler.jsonc に記入
npx wrangler r2 bucket create glp1diet-media
npm run db:migrate:remote

# 秘密情報を登録
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put OWNER_EMAIL
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_TEAM_WEBHOOK_SECRET
npx wrangler secret put STRIPE_TEAM_PAYMENT_LINK_URL

npm run deploy
```

その後:
- `wrangler.jsonc` の `vars.APP_ORIGIN` を本番オリジンに変更
- Stripe ダッシュボードの Webhook 送信先を `https://<本番ドメイン>/api/stripe/webhook` に変更
- 動画ファイルを R2 に配置: `wrangler r2 object put glp1diet-media/<key> --file ./<file>`
  （現在クライアントが参照しているキー: `medivista-academy-learning-preview_6ca26cf0.mp4`）

## 残課題

- [ ] 既存 MySQL からのデータ書き出しと D1 への投入（[docs/DATA-MIGRATION.md](./DATA-MIGRATION.md)）
- [ ] R2 への動画アセットのアップロード
- [ ] Vimeo 連携（`vimeo_integration_status.md` 参照。移行前から未完）
- [ ] 本番ドメイン（glp1.diet）の Cloudflare へのルーティング設定
