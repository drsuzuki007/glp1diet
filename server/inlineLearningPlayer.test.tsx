// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineLearningPlayer } from "../client/src/components/InlineLearningPlayer";

describe("InlineLearningPlayer", () => {
  afterEach(cleanup);

  it("renders page-contained controls and saves the current seek position", () => {
    const saveProgress = vi.fn();
    render(<InlineLearningPlayer title="日常に取り入れる運動習慣" category="食事・生活習慣" src="/sample.mp4" canSaveProgress initialProgressPercent={12} onSaveProgress={saveProgress} />);

    const video = screen.getByLabelText("日常に取り入れる運動習慣の学習動画") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 120 });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 36 });
    fireEvent.loadedMetadata(video);
    video.currentTime = 36;
    fireEvent.timeUpdate(video);

    expect(screen.getByLabelText("再生位置")).toBeTruthy();
    expect(screen.getByLabelText("音量")).toBeTruthy();
    expect(screen.getByLabelText("字幕を切り替える")).toBeTruthy();
    expect(screen.getByLabelText("再生速度")).toBeTruthy();
    expect(screen.getByRole("button", { name: "現在の位置を保存" })).toBeTruthy();

    fireEvent.click(screen.getByLabelText("字幕を切り替える"));
    expect(screen.getByLabelText("字幕を切り替える").getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText("音量"), { target: { value: "0.5" } });
    expect((screen.getByLabelText("音量") as HTMLInputElement).value).toBe("0.5");

    fireEvent.change(screen.getByLabelText("再生速度"), { target: { value: "1.5" } });
    expect((screen.getByLabelText("再生速度") as HTMLSelectElement).value).toBe("1.5");

    fireEvent.click(screen.getByRole("button", { name: "現在の位置を保存" }));
    expect(saveProgress).toHaveBeenCalledWith({ positionSeconds: 36, progressPercent: 30 });
  });

  it("renders a free-preview state without the progress-save action", () => {
    render(<InlineLearningPlayer title="無料プレビュー" category="GLP-1の基礎" src="/sample.mp4" canSaveProgress={false} />);
    expect(screen.getByRole("heading", { name: "無料プレビュー" })).toBeTruthy();
    expect(screen.getByText("加入すると、再生位置をマイページへ保存できます。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "現在の位置を保存" })).toBeNull();
  });
});
