import { describe, expect, it } from "vitest";
import { buildMonthlyLearningReport, mergeHistoricalProgressForReport } from "../shared/learningReport";

describe("buildMonthlyLearningReport", () => {
  it("groups actual playback-save events into monthly learning minutes and completions", () => {
    const report = buildMonthlyLearningReport([
      { recordedAt: new Date("2026-06-03T10:00:00Z"), watchedSeconds: 119, completed: false },
      { recordedAt: new Date("2026-06-17T10:00:00Z"), watchedSeconds: 61, completed: true },
      { recordedAt: new Date("2026-08-05T10:00:00Z"), watchedSeconds: 180, completed: true },
    ], new Date("2026-08-13T10:00:00Z"));

    expect(report).toHaveLength(6);
    expect(report.find(month => month.key === "2026-06")).toMatchObject({ watchedMinutes: 3, completedCount: 1 });
    expect(report.find(month => month.key === "2026-08")).toMatchObject({ watchedMinutes: 3, completedCount: 1 });
    expect(report.find(month => month.key === "2026-07")).toMatchObject({ watchedMinutes: 0, completedCount: 0 });
  });

  it("keeps even a short saved playback event visible as 0.1 minutes", () => {
    const report = buildMonthlyLearningReport([{ recordedAt: new Date("2026-08-05T10:00:00Z"), watchedSeconds: 1, completed: false }], new Date("2026-08-13T10:00:00Z"));
    expect(report.find(month => month.key === "2026-08")).toMatchObject({ watchedMinutes: 0.1, completedCount: 0 });
  });

  it("includes saved legacy progress once while avoiding a duplicate for a course with granular activity", () => {
    const reportEvents = mergeHistoricalProgressForReport(
      [{ courseId: 1, recordedAt: new Date("2026-08-05T10:00:00Z"), watchedSeconds: 60, completed: false }],
      [
        { courseId: 1, durationMinutes: 30, progressPercent: 50, completed: false, updatedAt: new Date("2026-08-05T10:00:00Z") },
        { courseId: 2, durationMinutes: 20, progressPercent: 100, completed: true, updatedAt: new Date("2026-08-05T10:00:00Z") },
      ],
    );
    const report = buildMonthlyLearningReport(reportEvents, new Date("2026-08-13T10:00:00Z"));

    expect(reportEvents).toHaveLength(2);
    expect(report.find(month => month.key === "2026-08")).toMatchObject({ watchedMinutes: 21, completedCount: 1 });
  });
});
