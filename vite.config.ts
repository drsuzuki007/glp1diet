import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * `vite dev` runs the React client AND the Worker (in workerd) together, with
 * local D1 / R2 bindings from wrangler.jsonc. There is no separate Express
 * process any more — the Worker in `worker/` is the server in every environment.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  // The Cloudflare plugin owns the output layout:
  //   dist/client    -> static assets uploaded to Workers Assets
  //   dist/glp1diet  -> the compiled Worker + generated wrangler.json
});
