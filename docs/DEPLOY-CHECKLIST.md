# 本番デプロイ 続きの手順

最終更新: 2026-09-02 / ローカル環境は完成済み、Cloudflare へのデプロイ途中で中断

## 現在の状態

### 完了していること

- [x] Manus/Express → Cloudflare Workers への移行（コード一式）
- [x] Node.js v24 インストール、`npm install`
- [x] `.dev.vars` の設定（JWT_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / OWNER_EMAIL）
- [x] Google OAuth クライアント作成（`glp1diet local`、プロジェクト `My First Project`）
      - JavaScript 生成元: `http://localhost:5173`
      - リダイレクト URI: `http://localhost:5173/api/oauth/callback`
- [x] ローカル D1 にマイグレーション適用 + 講座カタログの自動シード
- [x] 旧 Manus データの投入（`legacy-d1.sql`）
- [x] **ログイン成功・openId の自動引き継ぎ完了**
      `dVcXfUERezqiuiemS48eWw` → `google:102439226766435340079`
      admin 権限 / 契約1件 / 保存講座2件 / 視聴履歴5件 / 学習目標2件 すべて保持
- [x] `wrangler login` 完了（Cloudflare アカウント: Drsuzuki007@gmail.com）

### 未了

- [ ] D1 / R2 を Cloudflare 上に作成
- [ ] `wrangler.jsonc` に本番の `database_id` を記入
- [ ] 本番シークレットの登録
- [ ] workers.dev へのデプロイと動作確認
- [ ] 本番 D1 へのデータ投入
- [ ] Google OAuth に本番のリダイレクト URI を追加
- [ ] Stripe の本番キー設定（現在サンプル値。決済・契約画面は未稼働）
- [ ] 動画ファイルを R2 へアップロード
- [ ] Vimeo: `VIMEO_ACCESS_TOKEN`（edit 権限）を設定
- [ ] **ドメイン切り替えと同時に** `VIMEO_EMBED_DOMAINS=glp1.diet,www.glp1.diet` を設定し、
      管理画面の「登録済みの全動画に適用」を実行（先に設定すると workers.dev で再生できなくなる）
- [ ] 独自ドメイン glp1.diet の切り替え

## 再開手順

ターミナルで `cd ~/Documents/glp1diet-cf` してから順に。

### 1. D1 と R2 を作成

```bash
npx wrangler d1 create glp1diet-db 2>&1 | tee deploy.log
npx wrangler r2 bucket create glp1diet-media 2>&1 | tee -a deploy.log
```

R2 は支払い情報が未登録だと失敗することがある。その場合は `wrangler.jsonc` の
`r2_buckets` セクションを一時的に削除すればデプロイは通る（`/manus-storage/*` の
動画配信だけが 501 を返すようになる）。

### 2. database_id を wrangler.jsonc に書く

`d1 create` の出力に `database_id = "xxxxxxxx-..."` が出るので、
`wrangler.jsonc` の `d1_databases[0].database_id` のプレースホルダ
（`00000000-0000-0000-0000-000000000000`）と差し替える。

`npx wrangler d1 list --json` でも確認できる。

### 3. 本番シークレットを登録

`.dev.vars` の値を Worker のシークレットとして登録する。1つずつなら:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put OWNER_EMAIL
```

（プロンプトが出たら値を貼り付けて Enter）

まとめて登録する場合は `.dev.vars` を JSON に変換して `wrangler secret bulk`。

### 4. 本番 D1 にテーブルを作成してデプロイ

```bash
npx wrangler d1 migrations apply glp1diet-db --remote
npm run deploy
```

デプロイ後に `https://glp1diet.<サブドメイン>.workers.dev` という URL が表示される。**この URL を控える。**

### 5. Google OAuth に本番 URL を追加

https://console.cloud.google.com/auth/clients → `glp1diet local` を開いて追加:

- 承認済みの JavaScript 生成元: `https://glp1diet.<サブドメイン>.workers.dev`
- 承認済みのリダイレクト URI: `https://glp1diet.<サブドメイン>.workers.dev/api/oauth/callback`

`wrangler.jsonc` の `vars.APP_ORIGIN` も同じ URL に更新して再デプロイ。

### 6. 本番にデータを投入

**順番厳守。** 先にカタログをシードさせてから旧データを入れる。

```bash
# 1) 本番サイトをブラウザで一度開く（カタログが自動投入される）※まだログインしない
# 2) 旧データを投入
npx wrangler d1 execute glp1diet-db --remote --file=./legacy-d1.sql
# 3) ブラウザで Google ログイン → openId が自動的に引き継がれる
```

投入後の確認:

```bash
npx wrangler d1 execute glp1diet-db --remote --command \
  "select id, openId, email, role from users"
```

### 7. 後片付け

- `legacy-d1.sql` を削除（メールアドレスと Stripe ID が入っている）
- `deploy.log` / `d1-list.json` / `dev.log` を削除
- Google Cloud の古いクライアントシークレット（末尾 `-akc`）を削除

## 注意点

- **glp1.diet は Cloudflare に登録されていない。** 現在のアカウントにあるのは
  md-rep.com と md-rep.net のみ。独自ドメインに切り替えるには、まず glp1.diet を
  Cloudflare にネームサーバー移管するか、DNS を向ける必要がある。
- **ローカルと本番の D1 は別物。** `--local` と `--remote` を取り違えないこと。
- **旧データ投入の前にログインしない。** 同じメールの行が2件になると自動引き継ぎが止まる
  （詳細は `docs/DATA-MIGRATION.md`）。
- プロジェクトが iCloud Drive の「書類」配下にあるため、`node_modules` の同期が
  重くなる可能性がある。問題が出たら iCloud 同期の対象外に移すことを検討。
