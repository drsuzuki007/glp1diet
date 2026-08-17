// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ course: null as any }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ catalog: { actions: { invalidate: vi.fn() } }, library: { mine: { invalidate: vi.fn() } } }),
    catalog: {
      bySlug: { useQuery: () => ({ data: state.course, isLoading: false }) },
      actions: { useQuery: () => ({ data: { subscribed: false, monthlyPrice: 980, wishlisted: false } }) },
      toggleWishlist: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateProgress: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    subscription: { createCheckout: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/components/SiteFrame", () => ({ default: ({ children }: React.PropsWithChildren) => React.createElement("main", null, children) }));
vi.mock("@/components/CourseArtwork", () => ({ default: () => React.createElement("span", null, "artwork") }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children),
  useRoute: () => [true, { slug: "glp1-foundations" }],
}));

import CourseDetail from "../client/src/pages/CourseDetail";

function course(referenceLinks = [
  { id: 1, label: "日本肥満学会｜学術情報", url: "https://www.jasso.or.jp/contents/Introduction/academic-information.html", sortOrder: 1 },
  { id: 2, label: "日本糖尿病学会｜刊行物", url: "https://www.jds.or.jp/modules/publication/index.php", sortOrder: 2 },
  { id: 3, label: "厚生労働省 e-ヘルスネット", url: "https://kennet.mhlw.go.jp/information/information/", sortOrder: 3 },
]) {
  return {
    id: 1, slug: "glp1-foundations", title: "GLP-1を学ぶための基礎レッスン", summary: "一般向けの要約です。", description: "一般向けの要点です。",
    intendedFor: "受診前に情報を整理したい方", learningPoints: "基本用語を説明できる|質問を整理できる", referencesText: "既存の参考文献", coiText: "開示すべき利益相反はありません。",
    durationMinutes: 48, publishedAt: new Date("2026-01-18"), reviewedAt: new Date("2026-06-01"), thumbnailTheme: "gold", previewLabel: "無料プレビューを再生", isFeatured: true,
    category: { id: 1, slug: "glp1-basics", name: "GLP-1の基礎", description: "基礎" },
    doctor: { id: 1, slug: "risa-okada", name: "岡田 莉沙 医師", specialty: "内分泌・代謝内科", affiliation: "glp1.diet 医療教育センター", initials: "RO" },
    doctorProfile: "一般向け医療教育を担当しています。", referenceLinks,
  };
}

describe("CourseDetail structured content", () => {
  afterEach(cleanup);
  beforeEach(() => { state.course = course(); });

  it("renders the consumer-facing summary, key points, audience, learning outcomes, and three reference links", () => {
    render(<CourseDetail />);

    expect(screen.getByRole("heading", { name: "この動画で扱うこと" })).toBeTruthy();
    expect(screen.getAllByText("一般向けの要約です。")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "無料プレビュー" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "学習プレーヤー" })).toBeNull();
    expect(screen.getByRole("heading", { name: "この動画の要点" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "対象となる方" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "視聴後に得られる知識" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "根拠・補足のための参考URL" })).toBeTruthy();

    const links = screen.getAllByRole("link").filter(link => link.getAttribute("href")?.startsWith("https://"));
    expect(links).toHaveLength(3);
    expect(links[0]!.getAttribute("href")).toBe("https://www.jasso.or.jp/contents/Introduction/academic-information.html");
    expect(links[0]!.getAttribute("target")).toBe("_blank");
    expect(links[0]!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does not render the reference URL section when a course has no links", () => {
    state.course = course([]);
    render(<CourseDetail />);
    expect(screen.queryByRole("heading", { name: "根拠・補足のための参考URL" })).toBeNull();
  });
});
