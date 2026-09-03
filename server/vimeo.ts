/**
 * Vimeo 連携。
 *
 * 管理画面で動画 URL を貼り付けると、タイトル・サムネイル・再生時間を自動取得する。
 *   1) oEmbed        … 公開／限定公開の動画。トークン不要
 *   2) Vimeo API     … 1 で取れない非公開動画向け。VIMEO_ACCESS_TOKEN が必要
 *
 * 埋め込み URL の組み立ては `buildEmbedUrl()` に集約してある。Vimeo 側で
 * 「特定ドメインのみ埋め込み可」に切り替えるときも、コードの変更点はここだけ。
 */
import { ENV } from "./_core/env";

export type VimeoRef = {
  /** 数字だけの動画 ID。 */
  id: string;
  /** 限定公開動画のハッシュ（vimeo.com/{id}/{hash} や ?h={hash}）。 */
  hash: string | null;
};

export type VimeoMetadata = VimeoRef & {
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** 正規化した視聴ページ URL。 */
  canonicalUrl: string;
};

/**
 * 対応する URL の形:
 *   https://vimeo.com/123456789
 *   https://vimeo.com/123456789/abcdef1234      （限定公開）
 *   https://player.vimeo.com/video/123456789?h=abcdef1234
 * 数字だけ（"123456789"）を貼られた場合も受け付ける。
 */
export function parseVimeoUrl(input: string): VimeoRef | null {
  const raw = input.trim();
  if (!raw) return null;

  // URL ではなく ID だけ貼られたケース
  if (/^\d+$/.test(raw)) return { id: raw, hash: null };

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!/(^|\.)vimeo\.com$/i.test(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  let hash: string | null = null;

  if (/^player\./i.test(url.hostname)) {
    const index = parts.indexOf("video");
    const candidate = index >= 0 ? parts[index + 1] : undefined;
    if (candidate && /^\d+$/.test(candidate)) id = candidate;
  } else if (parts[0] && /^\d+$/.test(parts[0])) {
    id = parts[0];
    if (parts[1] && /^[0-9a-z]+$/i.test(parts[1])) hash = parts[1];
  }

  const queryHash = url.searchParams.get("h");
  if (queryHash && /^[0-9a-z]+$/i.test(queryHash)) hash = queryHash;

  return id ? { id, hash } : null;
}

export function canonicalVimeoUrl(ref: VimeoRef): string {
  return ref.hash ? `https://vimeo.com/${ref.id}/${ref.hash}` : `https://vimeo.com/${ref.id}`;
}

/** 秒数を "12:34" / "1:02:03" に整形する。 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 講座の `durationMinutes` に入れる値。秒を分へ切り上げる（0 分にはしない）。 */
export function durationToMinutes(seconds: number | null | undefined): number | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(1, Math.round(seconds / 60));
}

type OEmbedResponse = { title?: string; thumbnail_url?: string; duration?: number };
type VimeoApiResponse = { name?: string; duration?: number; pictures?: { sizes?: Array<{ link?: string }> } };

/**
 * 動画のメタデータを取得する。取得できない場合は日本語の理由を投げる。
 */
export async function fetchVimeoMetadata(input: string): Promise<VimeoMetadata> {
  const ref = parseVimeoUrl(input);
  if (!ref) {
    throw new Error(
      "Vimeo の URL として読み取れませんでした。https://vimeo.com/動画ID の形式で貼り付けてください。"
    );
  }

  const canonicalUrl = canonicalVimeoUrl(ref);

  // 1) oEmbed（トークン不要）
  try {
    const endpoint = new URL("https://vimeo.com/api/oembed.json");
    endpoint.searchParams.set("url", canonicalUrl);
    endpoint.searchParams.set("width", "1280");
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (response.ok) {
      const data = (await response.json()) as OEmbedResponse;
      return {
        ...ref,
        canonicalUrl,
        title: data.title?.trim() || "",
        thumbnailUrl: data.thumbnail_url || null,
        durationSeconds: typeof data.duration === "number" ? data.duration : null,
      };
    }
  } catch (error) {
    console.warn("[Vimeo] oEmbed に失敗しました:", error);
  }

  // 2) Vimeo API（非公開動画向けフォールバック）
  const token = ENV.vimeoAccessToken;
  if (token) {
    try {
      const response = await fetch(
        `https://api.vimeo.com/videos/${ref.id}?fields=name,duration,pictures.sizes`,
        { headers: { Authorization: `Bearer ${token}`, accept: "application/json" } }
      );
      if (response.ok) {
        const data = (await response.json()) as VimeoApiResponse;
        const sizes = data.pictures?.sizes ?? [];
        return {
          ...ref,
          canonicalUrl,
          title: data.name?.trim() || "",
          thumbnailUrl: sizes.length ? sizes[sizes.length - 1]?.link ?? null : null,
          durationSeconds: typeof data.duration === "number" ? data.duration : null,
        };
      }
      console.warn(`[Vimeo] API が ${response.status} を返しました`);
    } catch (error) {
      console.warn("[Vimeo] API 呼び出しに失敗しました:", error);
    }
  }

  throw new Error(
    token
      ? "この動画の情報を取得できませんでした。動画 ID と、アクセストークンの権限をご確認ください。"
      : "この動画の情報を取得できませんでした。非公開動画の場合は VIMEO_ACCESS_TOKEN を設定してください。"
  );
}

/**
 * 会員に配信する埋め込み URL。
 *
 * Vimeo 側を「特定ドメインのみ埋め込み可」に変更する際も、埋め込み URL 自体は
 * 変わらない（許可判定は Vimeo 側が Referer で行う）。将来の分岐が必要になったら
 * この関数だけを変更すればよい。
 */
export function buildEmbedUrl(vimeoId: string, vimeoHash?: string | null): string {
  const params = new URLSearchParams();
  if (vimeoHash) params.set("h", vimeoHash);
  params.set("dnt", "1"); // Vimeo 側のトラッキングを無効化
  params.set("title", "0");
  params.set("byline", "0");
  params.set("portrait", "0");
  return `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// 埋め込みドメイン制限
//
// Vimeo 側で「特定のドメインでのみ埋め込み可」に切り替える操作を API から行う。
//   1) PATCH /videos/{id}                       privacy.embed = "whitelist"
//   2) PUT   /videos/{id}/privacy/domains/{dom} 許可ドメインを追加
// 変更後は必ず読み戻して、実際に反映されたかを確認する。
//
// VIMEO_EMBED_DOMAINS が未設定のあいだは一切 Vimeo を触らない（localhost や
// workers.dev でも再生できる状態のまま）。ドメイン切り替えのタイミングで設定する。
// ---------------------------------------------------------------------------

/** "glp1.diet, https://www.glp1.diet/" → ["glp1.diet", "www.glp1.diet"] */
export function parseEmbedDomains(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const domain = normalizeDomain(part);
    if (domain) seen.add(domain);
  }
  return [...seen];
}

/** スキーム・パス・末尾スラッシュを落として小文字にする。不正なら null。 */
export function normalizeDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!trimmed) return null;
  // ホスト名として妥当な形だけ通す（ポート・ワイルドカードは Vimeo 側が受け付けない）
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmed) ? trimmed : null;
}

/** 設定されている許可ドメイン。空配列なら制限を適用しない。 */
export function configuredEmbedDomains(): string[] {
  return parseEmbedDomains(ENV.vimeoEmbedDomains);
}

function requireToken(): string {
  const token = ENV.vimeoAccessToken;
  if (!token) {
    throw new Error(
      "VIMEO_ACCESS_TOKEN が未設定です。埋め込みドメイン制限には edit 権限つきのトークンが必要です。"
    );
  }
  return token;
}

async function vimeoApi(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`https://api.vimeo.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      accept: "application/vnd.vimeo.*+json;version=3.4",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Vimeo API ${init.method ?? "GET"} ${path} が ${response.status} を返しました${detail ? `: ${detail.slice(0, 300)}` : ""}`
    );
  }
  return response;
}

export type EmbedPrivacyState = {
  vimeoId: string;
  title: string;
  /** "public" = どこでも埋め込み可 / "whitelist" = 指定ドメインのみ / "private" = 埋め込み不可 */
  embed: string;
  domains: string[];
};

/** 現在の設定を読む（変更はしない）。 */
export async function readEmbedPrivacy(vimeoId: string): Promise<EmbedPrivacyState> {
  const videoResponse = await vimeoApi(`/videos/${encodeURIComponent(vimeoId)}?fields=name,privacy.embed`);
  const video = (await videoResponse.json()) as { name?: string; privacy?: { embed?: string } };

  let domains: string[] = [];
  try {
    const domainResponse = await vimeoApi(`/videos/${encodeURIComponent(vimeoId)}/privacy/domains`);
    const payload = (await domainResponse.json()) as { data?: Array<{ domain?: string }> };
    domains = (payload.data ?? []).map(item => item.domain ?? "").filter(Boolean);
  } catch {
    // whitelist でない動画では 404 になることがある。空扱いでよい。
  }

  return {
    vimeoId,
    title: video.name ?? "",
    embed: video.privacy?.embed ?? "unknown",
    domains,
  };
}

export type EmbedRestrictionResult = {
  vimeoId: string;
  applied: boolean;
  /** 適用後に読み戻した実際の状態。 */
  state?: EmbedPrivacyState;
  error?: string;
};

/**
 * 指定ドメインでのみ埋め込み可にする。
 * `domains` が空なら何もしない（applied=false）。
 */
export async function restrictEmbedToDomains(
  vimeoId: string,
  domains: string[] = configuredEmbedDomains()
): Promise<EmbedRestrictionResult> {
  if (domains.length === 0) return { vimeoId, applied: false };

  try {
    await vimeoApi(`/videos/${encodeURIComponent(vimeoId)}`, {
      method: "PATCH",
      body: JSON.stringify({ privacy: { embed: "whitelist" } }),
    });

    for (const domain of domains) {
      await vimeoApi(`/videos/${encodeURIComponent(vimeoId)}/privacy/domains/${encodeURIComponent(domain)}`, {
        method: "PUT",
      });
    }

    // 読み戻して、本当に反映されたかを確認する
    const state = await readEmbedPrivacy(vimeoId);
    const missing = domains.filter(domain => !state.domains.includes(domain));
    if (state.embed !== "whitelist" || missing.length > 0) {
      return {
        vimeoId,
        applied: false,
        state,
        error:
          state.embed !== "whitelist"
            ? `埋め込み設定が "${state.embed}" のままです。`
            : `許可ドメインに ${missing.join(", ")} が入っていません。`,
      };
    }
    return { vimeoId, applied: true, state };
  } catch (error) {
    return { vimeoId, applied: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** 制限を解除して、どこでも埋め込める状態に戻す。 */
export async function releaseEmbedRestriction(vimeoId: string): Promise<EmbedRestrictionResult> {
  try {
    await vimeoApi(`/videos/${encodeURIComponent(vimeoId)}`, {
      method: "PATCH",
      body: JSON.stringify({ privacy: { embed: "public" } }),
    });
    return { vimeoId, applied: true, state: await readEmbedPrivacy(vimeoId) };
  } catch (error) {
    return { vimeoId, applied: false, error: error instanceof Error ? error.message : String(error) };
  }
}
