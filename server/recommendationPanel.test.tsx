// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mode: "optimistic" as "optimistic" | "rollback" | "removeSuccess",
  reject: null as null | (() => void),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ library: { mine: { invalidate: vi.fn() } } }),
    catalog: {
      toggleWishlist: {
        useMutation: (options: {
          onMutate?: (input: { courseId: number }) => unknown;
          onSuccess?: (result: { wishlisted: boolean }) => void;
          onError?: (error: Error, input: { courseId: number }, context: unknown) => void;
        }) => ({
          isPending: false,
          mutate: (input: { courseId: number }) => {
            const context = options.onMutate?.(input);
            if (state.mode === "rollback") {
              state.reject = () => options.onError?.(new Error("save failed"), input, context);
            } else if (state.mode === "removeSuccess") {
              options.onSuccess?.({ wishlisted: false });
            }
          },
        }),
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("@/components/CourseArtwork", () => ({ default: () => React.createElement("span", null, "artwork") }));

import { RecommendationPanel } from "../client/src/pages/MyPage";

const course = {
  id: 42,
  slug: "saved-course",
  title: "保存状態を確認する講座",
  durationMinutes: 28,
  thumbnailTheme: "aqua",
  category: { name: "GLP-1の基礎" },
} as never;

function recommendations(wishlisted: boolean) {
  return [{ course, reason: "保存状態の確認", kind: "topic" as const, wishlisted }];
}

describe("RecommendationPanel wishlist integration", () => {
  afterEach(cleanup);

  beforeEach(() => {
    state.mode = "optimistic";
    state.reject = null;
  });

  it("hydrates the saved state from recommendation data after a reload", async () => {
    render(<RecommendationPanel recommendations={recommendations(true)} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "保存済み" }).getAttribute("aria-pressed")).toBe("true"));
  });

  it("updates optimistically on save and rolls back when the wishlist request fails", async () => {
    const user = userEvent.setup();
    const view = render(<RecommendationPanel recommendations={recommendations(false)} />);

    await user.click(screen.getByRole("button", { name: "後で見る" }));
    expect(screen.getByRole("button", { name: "保存済み" }).getAttribute("aria-pressed")).toBe("true");

    view.unmount();
    state.mode = "rollback";
    render(<RecommendationPanel recommendations={recommendations(false)} />);

    await user.click(screen.getByRole("button", { name: "後で見る" }));
    state.reject?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "後で見る" }).getAttribute("aria-pressed")).toBe("false"));
  });

  it("switches a saved recommendation to unsaved optimistically when removing it", async () => {
    const user = userEvent.setup();
    state.mode = "removeSuccess";
    render(<RecommendationPanel recommendations={recommendations(true)} />);

    await user.click(screen.getByRole("button", { name: "保存済み" }));
    expect(screen.getByRole("button", { name: "後で見る" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("rolls a failed removal back to the saved state", async () => {
    const user = userEvent.setup();
    state.mode = "rollback";
    render(<RecommendationPanel recommendations={recommendations(true)} />);

    await user.click(screen.getByRole("button", { name: "保存済み" }));
    expect(screen.getByRole("button", { name: "後で見る" }).getAttribute("aria-pressed")).toBe("false");

    state.reject?.();
    await waitFor(() => expect(screen.getByRole("button", { name: "保存済み" }).getAttribute("aria-pressed")).toBe("true"));
  });
});
