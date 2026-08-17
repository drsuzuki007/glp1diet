import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getCourseBySlug } from "../db";
import { buildCoursePageMetadata, genericPageMetadata, injectPageMetadata } from "../courseMetadata";

function requestOrigin(req: express.Request) {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http" ? forwardedProtocol : req.protocol;
  const host = req.get("host") ?? "glp1.diet";
  return `${protocol}://${host}`;
}

async function injectRouteMetadata(req: express.Request, template: string) {
  const origin = requestOrigin(req);
  const pathname = new URL(req.originalUrl, origin).pathname;
  const courseMatch = pathname.match(/^\/courses\/([a-z0-9-]{1,96})$/);
  if (!courseMatch) return injectPageMetadata(template, genericPageMetadata(origin));
  const course = await getCourseBySlug(courseMatch[1]!);
  return injectPageMetadata(template, course ? buildCoursePageMetadata(course, origin) : genericPageMetadata(origin));
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      template = await injectRouteMetadata(req, template);
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const staticCandidates = [
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "..", "public"),
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  const distPath = staticCandidates.find(candidate => fs.existsSync(candidate)) ?? staticCandidates[0]!;
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory. Checked: ${staticCandidates.join(", ")}`
    );
  } else {
    console.log(`[Static] Serving client files from ${distPath}`);
  }

  app.use(express.static(distPath));

  // Fall through to index.html if the file doesn't exist, with route-aware metadata.
  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).end(await injectRouteMetadata(req, template));
    } catch (error) {
      console.error(`[Static] Failed to serve ${req.originalUrl} from ${distPath}`, error);
      next(error);
    }
  });
}
