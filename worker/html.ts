/**
 * HTML document handler.
 *
 * Preserves the SEO behaviour of the old Express `serveStatic`/`setupVite`:
 * `index.html` ships with `__PAGE_TITLE__` / `__PAGE_DESCRIPTION__` /
 * `__PAGE_CANONICAL_URL__` placeholders and a `<!--PAGE_STRUCTURED_DATA-->`
 * marker, which are filled in per route before the document is returned.
 * `/courses/:slug` gets course-specific metadata and JSON-LD; everything else
 * gets the site defaults.
 */
import {
  buildCoursePageMetadata,
  genericPageMetadata,
  injectPageMetadata,
} from "../server/courseMetadata";
import { getCourseBySlug } from "../server/db";
import { getRequestContext } from "./runtime";

const COURSE_PATH = /^\/courses\/([a-z0-9-]{1,96})$/;

function documentOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwardedProto === "https" || forwardedProto === "http" ? `${forwardedProto}:` : url.protocol;
  return `${protocol}//${url.host}`;
}

async function metadataForPath(pathname: string, origin: string) {
  const match = pathname.match(COURSE_PATH);
  if (!match) return genericPageMetadata(origin);

  try {
    const course = await getCourseBySlug(match[1]!);
    return course ? buildCoursePageMetadata(course, origin) : genericPageMetadata(origin);
  } catch (error) {
    // A database hiccup must never take the page down — fall back to defaults.
    console.warn("[HTML] Could not load course metadata:", error);
    return genericPageMetadata(origin);
  }
}

export async function handleDocument(request: Request): Promise<Response> {
  const { env } = getRequestContext();
  const assetResponse = await env.ASSETS.fetch(request);

  const contentType = assetResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return assetResponse;

  const url = new URL(request.url);
  const origin = documentOrigin(request);
  const template = await assetResponse.text();
  const html = injectPageMetadata(template, await metadataForPath(url.pathname, origin));

  const headers = new Headers(assetResponse.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.delete("content-length");
  headers.delete("etag");

  return new Response(html, { status: assetResponse.status, headers });
}
