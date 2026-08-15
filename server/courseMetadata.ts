export type CourseMetadataInput = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  durationMinutes: number;
  publishedAt: Date | string;
  reviewedAt: Date | string;
  doctor: { name: string };
  referenceLinks: Array<{ label: string; url: string }>;
};

export type PageMetadata = {
  title: string;
  description: string;
  canonicalUrl: string;
  structuredData: Record<string, unknown>;
};

const genericDescription = "glp1.diet — 医師制作・監修の一般向け医療教育動画サブスクリプション。個別の診断、治療、処方、効果保証は行いません。";

function normaliseDescription(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}…` : compact;
}

function dateToIso(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildCoursePageMetadata(course: CourseMetadataInput, origin: string): PageMetadata {
  const canonicalUrl = `${origin.replace(/\/$/, "")}/courses/${encodeURIComponent(course.slug)}`;
  const description = normaliseDescription(course.summary || course.description || genericDescription);
  const publishedAt = dateToIso(course.publishedAt);
  const reviewedAt = dateToIso(course.reviewedAt);
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description,
    url: canonicalUrl,
    courseMode: "online",
    educationalLevel: "一般向け",
    inLanguage: "ja-JP",
    timeRequired: `PT${course.durationMinutes}M`,
    provider: { "@type": "Organization", name: "glp1.diet", url: origin },
    creator: { "@type": "Person", name: course.doctor.name },
    datePublished: publishedAt,
    dateModified: reviewedAt,
    isAccessibleForFree: false,
    offers: { "@type": "Offer", price: "980", priceCurrency: "JPY", category: "subscription" },
    citation: course.referenceLinks.slice(0, 3).map(link => ({ "@type": "CreativeWork", name: link.label, url: link.url })),
  };
  return { title: `${course.title}｜glp1.diet`, description, canonicalUrl, structuredData };
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function injectPageMetadata(template: string, metadata: PageMetadata) {
  const structuredData = JSON.stringify(metadata.structuredData).replace(/</g, "\\u003c");
  return template
    .replaceAll("__PAGE_TITLE__", escapeHtml(metadata.title))
    .replaceAll("__PAGE_DESCRIPTION__", escapeHtml(metadata.description))
    .replaceAll("__PAGE_CANONICAL_URL__", escapeHtml(metadata.canonicalUrl))
    .replace("<!--PAGE_STRUCTURED_DATA-->", `<script type="application/ld+json">${structuredData}</script>`);
}

export function genericPageMetadata(origin: string): PageMetadata {
  const canonicalUrl = `${origin.replace(/\/$/, "")}/`;
  return {
    title: "glp1.diet｜医師と学ぶ医療教育動画",
    description: genericDescription,
    canonicalUrl,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "glp1.diet",
      url: origin,
      inLanguage: "ja-JP",
    },
  };
}
