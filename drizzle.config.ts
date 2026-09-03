import { defineConfig } from "drizzle-kit";

/**
 * Migrations are generated from `drizzle/schema.ts` into `drizzle/migrations/`
 * and applied with wrangler:
 *
 *   npm run db:generate         # write a new migration from the schema
 *   npm run db:migrate:local    # apply to the local (miniflare) D1
 *   npm run db:migrate:remote   # apply to the deployed D1
 *
 * drizzle-kit itself never connects to D1 here, so no credentials are needed.
 */
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
});
