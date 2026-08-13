// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecommendationBookmarkButton from "../client/src/components/RecommendationBookmarkButton";

describe("RecommendationBookmarkButton", () => {
  afterEach(cleanup);

  it("renders a persisted saved state after a recommendation card reloads", () => {
    render(<RecommendationBookmarkButton wishlisted onToggle={() => undefined} />);

    const button = screen.getByRole("button", { name: "保存済み" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("delegates save and remove actions while the parent updates the displayed state", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const view = render(<RecommendationBookmarkButton wishlisted={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "後で見る" }));
    expect(onToggle).toHaveBeenCalledTimes(1);

    view.rerender(<RecommendationBookmarkButton wishlisted onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "保存済み" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "保存済み" }));
    expect(onToggle).toHaveBeenCalledTimes(2);

    view.rerender(<RecommendationBookmarkButton wishlisted={false} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "後で見る" }).getAttribute("aria-pressed")).toBe("false");
  });
});
