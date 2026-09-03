/**
 * `/manus-storage/*` — course media.
 *
 * The path is kept from the Manus deployment so URLs already baked into the
 * client and the database keep resolving. The bytes now come from the R2
 * bucket bound as `MEDIA` instead of a presigned S3 redirect.
 *
 * Upload with:  wrangler r2 object put glp1diet-media/<key> --file ./<file>
 */
import { getRequestContext } from "./runtime";

export const MEDIA_PATH_PREFIX = "/manus-storage/";

export async function handleMedia(request: Request): Promise<Response> {
  const { env } = getRequestContext();
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.slice(MEDIA_PATH_PREFIX.length));

  if (!key) return new Response("Missing storage key", { status: 400 });
  if (!env.MEDIA) {
    return new Response(
      "Media bucket is not bound. Create it with `wrangler r2 bucket create glp1diet-media`.",
      { status: 501 }
    );
  }

  const object = await env.MEDIA.get(key, {
    range: request.headers,
    onlyIf: request.headers,
  });

  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") ?? "public, max-age=3600");
  headers.set("accept-ranges", "bytes");

  if (!("body" in object)) return new Response(null, { status: 304, headers });

  const status = object.range ? 206 : 200;
  if (object.range && "offset" in object.range && "length" in object.range) {
    const start = object.range.offset ?? 0;
    const end = start + (object.range.length ?? object.size) - 1;
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
  }

  return new Response(object.body, { status, headers });
}
