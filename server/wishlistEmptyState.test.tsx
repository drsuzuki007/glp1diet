// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children),
  useSearch: () => "",
  useLocation: () => ["/mypage", vi.fn()],
}));
vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("@/components/CourseArtwork", () => ({ default: () => React.createElement("span", null, "artwork") }));
vi.mock("@/components/RecommendationBookmarkButton", () => ({ default: () => React.createElement("button", null, "後で見る") }));
vi.mock("@/components/SiteFrame", () => ({ default: ({ children }: React.PropsWithChildren) => React.createElement("main", null, children) }));

import { WishlistEmptyState } from "../client/src/pages/MyPage";

describe("WishlistEmptyState", () => {
  afterEach(cleanup);

  it("shows a save prompt and catalog CTA when the wishlist is empty", () => {
    render(<WishlistEmptyState item={{ id: "wishlist-empty", kind: "wishlist-empty", filter: "all", isEmptyLibrary: true }} />);

    expect(screen.getByRole("heading", { name: "マイリストはまだ空です" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "講座を探す" }).getAttribute("href")).toBe("/catalog");
  });

  it("keeps the filtered empty state distinct without a catalog CTA", () => {
    render(<WishlistEmptyState item={{ id: "wishlist-empty", kind: "wishlist-empty", filter: "inProgress", isEmptyLibrary: false }} />);

    expect(screen.getByRole("heading", { name: "視聴中の保存講座はありません" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "講座を探す" })).toBeNull();
  });
});
