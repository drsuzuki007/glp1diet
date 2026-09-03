# glp1.diet

医師制作・監修の一般向け医療教育動画サブスクリプション。
Cloudflare Workers + D1 + R2 上で動く React SPA + tRPC API。

```bash
npm install
cp .dev.vars.example .dev.vars   # 値を記入
npm run db:migrate:local
npm run dev                      # http://localhost:5173
```

- 開発者向けの構成・規約: [CLAUDE.md](./CLAUDE.md)
- Manus/Express 版からの移行内容: [docs/MIGRATION.md](./docs/MIGRATION.md)
