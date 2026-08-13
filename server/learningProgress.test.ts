import { describe, expect, it } from "vitest";
import { calculateVideoProgress, progressForSaving } from "../shared/learning";

describe("learning progress helpers", () => {
  it("calculates a bounded percentage from a playable video position", () => {
    expect(calculateVideoProgress(2, 8)).toBe(25);
    expect(calculateVideoProgress(9, 8)).toBe(100);
    expect(calculateVideoProgress(-1, 8)).toBe(0);
  });

  it("uses a safe minimum progress when saving a just-started lesson", () => {
    expect(progressForSaving(0.2, 8, 0)).toBe(10);
    expect(progressForSaving(4, 8, 0)).toBe(50);
    expect(progressForSaving(0, 0, 42)).toBe(42);
  });
});
