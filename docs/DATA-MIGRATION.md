# 旧 Manus 版からのユーザーデータ引き継ぎ

移行後は `users.openId` の形式が変わる（Manus の識別子 → `google:<sub>`）。
そのままだと旧アカウントと新ログインが別人として扱われる。

このプロジェクトには **確認済みメールアドレスで自動的に突き合わせる仕組み** が入っている
（`worker/auth/routes.ts` → `server/db.ts` の `relinkLegacyOpenIdByEmail()`）。
やることは「旧データを D1 に入れる」「ログインする」の2つだけ。

## 突き合わせの仕組み

Google で初回ログインしたとき:

1. Google が「このメールは確認済み」と言っている場合のみ処理する
2. 同じメールアドレスを持つ `users` の行を探す（大文字小文字は無視）
3. `google:` で始まらない行（＝移行前の行）が **ちょうど1件** なら、その行の `openId` を
   `google:<sub>` に書き換える
4. 0件なら新規ユーザーとして作成、2件以上なら**何もしない**（誤って別人を統合しないため）

書き換わるのは `users.openId` の1カラムだけ。`subscriptions` / `wishlists` /
`viewingProgress` / `learningGoals` / `team_members` はすべて `users.id` を参照しているので、
契約状態・保存した講座・視聴履歴・権限がそのまま引き継がれる。
2回目以降のログインでは何も起きない。

---

## 手順

### ステップ 0 — 管理者権限の設定

`.dev.vars`（本番は `wrangler secret put OWNER_EMAIL`）に:

```
OWNER_EMAIL=drsuzuki007@gmail.com
```

このメールでログインしたアカウントは自動的に `role=admin` になる。
Google の subject id を調べる必要はない。

### ステップ 1 — 旧データを Manus の「中で」書き出す

`DATABASE_URL` は Manus が自動注入する機密情報で、値を外に持ち出す必要はない。
そのため、エクスポートは**旧 Manus プロジェクトの中で実行する**。

1. `scripts/export-legacy-to-d1.mjs` を旧 Manus プロジェクトにコピーする
   （このリポジトリの `scripts/` にある）
2. Manus のターミナル（またはエージェント）で実行する:

```bash
node scripts/export-legacy-to-d1.mjs --email drsuzuki007@gmail.com
```

全ユーザーを移行するなら `--all`。

スクリプトは `DATABASE_URL` を環境変数として読むだけで、**値は一切表示しない**
（エラーメッセージ中の接続文字列も伏せる）。出力は `legacy-d1.sql` の1ファイルのみ。

3. できた `legacy-d1.sql` をダウンロードして、`glp1diet-cf/` の直下に置く

**生成される SQL の性質**

- 講座カタログ（categories / doctors / courses / catalog_rows）は**含まれない**。
  新環境では `server/seed.ts` が同じ内容を自動投入するため。
- そのぶん講座の id は新旧で一致しない可能性があるので、視聴履歴・保存講座は
  id ではなく **slug で解決する** `INSERT ... SELECT` になっている。
  新環境に存在しない slug の行は、エラーにならず単に飛ばされる。
- ユーザー行は**旧 openId のまま**入る。書き換えはログイン時に自動で起きる。
- 何度実行しても結果が変わらない（冪等）。

### ステップ 2 — 新環境に投入する

**順番が重要。** 講座カタログが入る前に SQL を流すと、視聴履歴が紐づかない。
また、旧データを入れる前にログインすると同じメールの行が2件になり、自動リンクが止まる。

```bash
cd ~/Documents/glp1diet-cf
npm run db:migrate:local          # 1. テーブルを作る

npm run dev                       # 2. 起動して、ブラウザで http://localhost:5173 を一度開く
                                  #    （講座カタログが自動投入される）※まだログインしない

npx wrangler d1 execute glp1diet-db --local --file=./legacy-d1.sql   # 3. 旧データを投入
```

投入できたか確認:

```bash
npx wrangler d1 execute glp1diet-db --local --command \
  "select id, openId, email, role, plan, subscriptionStatus from users"
```

### ステップ 3 — ログインして引き継ぎを確認する

ブラウザで Google ログイン。`npm run dev` のログに次の行が出れば成功:

```
[Migration] Relinked user #1 (manus_xxxxx -> google:1234567890) by email
```

```bash
npx wrangler d1 execute glp1diet-db --local --command \
  "select u.openId, u.email, u.role, u.plan,
          (select count(*) from wishlists where userId=u.id) as wishlist,
          (select count(*) from viewingProgress where userId=u.id) as progress
     from users u"
```

`openId` が `google:` に変わり、`role` が `admin`、保存講座と視聴履歴の件数が
旧環境と一致していれば完了。

### ステップ 4 — 本番へ

ローカルで確認できたら、同じ SQL を本番 D1 に流す:

```bash
npx wrangler d1 migrations apply glp1diet-db --remote
# 本番サイトを一度開いてカタログをシードさせてから
npx wrangler d1 execute glp1diet-db --remote --file=./legacy-d1.sql
```

---

## 旧DBが使えなかった場合

自分のアカウントだけなら、実は困らない:

1. `OWNER_EMAIL=drsuzuki007@gmail.com` を設定する
2. Google でログインする → 新しい `users` 行が作られ、`role=admin` になる
3. 講座カタログは初回アクセス時に自動投入されるので、手作業は不要

失われるのは自分の視聴履歴と保存した講座だけ。契約情報は Stripe 側が正なので、
必要なら顧客 ID を紐づければ復元できる:

```bash
# Stripe ダッシュボードで cus_xxx を確認してから
npx wrangler d1 execute glp1diet-db --local --command \
  "update users set stripeCustomerId='cus_xxxxxxxx' where lower(email)='drsuzuki007@gmail.com'"
```

その後アプリの「契約状況を更新」（`subscription.refresh`）で Stripe から同期される。

---

## 注意点

- **本番の前に必ずローカルで試す。** リンクは1回きりで、後戻りできない
- 旧データを入れる**前に**ログインしてしまうと、同じメールの行が2件になり自動リンクが止まる。
  その場合は手動で直す:
  ```bash
  # 新しくできた空の行を確認してから、旧行の openId を書き換える
  npx wrangler d1 execute glp1diet-db --local --command \
    "select id, openId, email, createdAt from users where lower(email)='drsuzuki007@gmail.com'"
  ```
- 同じメールの旧行が2件以上ある場合も、安全のため何もしない。手動で `openId` を更新する
- Google が `email_verified=false` を返すアカウントはリンクされない（なりすまし防止）
- `DATABASE_URL` の実値をファイルやチャットに貼らない。エクスポートは Manus の中で完結させる
