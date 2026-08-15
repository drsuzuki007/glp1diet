import { describe, expect, it } from "vitest";
import { buildCoursePageMetadata, injectPageMetadata } from "./courseMetadata";

const course = {
  slug: "glp1-foundations",
  title: "GLP-1を学ぶための基礎レッスン",
  summary: "GLP-1が体内で担う一般的な役割を、受診時の対話に役立つ基礎知識として整理する入門講座です。",
  description: "一般向けの医療教育コンテンツです。",
  durationMinutes: 48,
  publishedAt: "2026-01-18T00:00:00.000Z",
  reviewedAt: "2026-06-01T00:00:00.000Z",
  doctor: { name: "岡田 莉沙 医師" },
  referenceLinks: [{ label: "日本肥満学会", url: "https://www.jasso.or.jp/" }],
};

describe("course page metadata", () => {
  it("builds a canonical course URL and structured course context", () => {
    const metadata = buildCoursePageMetadata(course, "https://glp1.diet");
    expect(metadata.title).toBe("GLP-1を学ぶための基礎レッスン｜glp1.diet");
    expect(metadata.canonicalUrl).toBe("https://glp1.diet/courses/glp1-foundations");
    expect(metadata.structuredData).toMatchObject({ "@type": "Course", timeRequired: "PT48M", inLanguage: "ja-JP" });
    expect(metadata.structuredData.citation).toEqual([{ "@type": "CreativeWork", name: "日本肥満学会", url: "https://www.jasso.or.jp/" }]);
  });

  it("injects escaped metadata and JSON-LD into the HTML placeholders", () => {
    const metadata = buildCoursePageMetadata({ ...course, title: "<安全な講座>" }, "https://glp1.diet");
    const html = injectPageMetadata("<title>__PAGE_TITLE__</title><meta content=\"__PAGE_DESCRIPTION__\"><link href=\"__PAGE_CANONICAL_URL__\"><!--PAGE_STRUCTURED_DATA-->", metadata);
    expect(html).toContain("&lt;安全な講座&gt;｜glp1.diet");
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("https://glp1.diet/courses/glp1-foundations");
  });
});
