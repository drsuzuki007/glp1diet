/**
 * Test bootstrap.
 *
 * Several tests are *configuration guards*: they assert that a required
 * environment variable is present. In the Workers runtime those values come
 * from `.dev.vars` / `wrangler secret`, which Vitest does not read, so we load
 * `.dev.vars` here when it exists and otherwise fall back to the checked-in
 * placeholder values so the suite stays runnable on a fresh clone.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return false;
  for (const rawLine of fs.readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const root = path.resolve(import.meta.dirname);
loadEnvFile(path.join(root, ".dev.vars"));
loadEnvFile(path.join(root, ".dev.vars.example"));
