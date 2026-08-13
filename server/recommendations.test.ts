import { describe, expect, it } from "vitest";
import { buildRecommendations } from "../shared/recommendations";

const date = new Date("2026-08-13T00:00:00Z");
const courses = [
  { id: 1, slug: "a", title: "基礎1", durationMinutes: 30, publishedAt: date, category: { id: 1, slug: "glp1", name: "GLP-1の基礎" } },
  { id: 2, slug: "b", title: "基礎2", durationMinutes: 35, publishedAt: new Date("2026-08-12T00:00:00Z"), category: { id: 1, slug: "glp1", name: "GLP-1の基礎" } },
  { id: 3, slug: "c", title: "運動", durationMinutes: 25, publishedAt: new Date("2026-08-11T00:00:00Z"), category: { id: 2, slug: "food-lifestyle", name: "食事・生活習慣" } },
  { id: 4, slug: "d", title: "検査", durationMinutes: 27, publishedAt: new Date("2026-08-10T00:00:00Z"), category: { id: 3, slug: "labs", name: "代謝と検査値" } },
];

describe("buildRecommendations", () => {
  it("puts unfinished learning first and does not re-recommend completed courses", () => {
    const recommendations = buildRecommendations(courses, [
      { id: 1, progressPercent: 100, completed: true },
      { id: 3, progressPercent: 45, completed: false },
    ]);

    expect(recommendations.map(item => item.course.id)).toEqual([3, 2, 4]);
    expect(recommendations[0]).toMatchObject({ kind: "continue" });
    expect(recommendations.some(item => item.course.id === 1)).toBe(false);
    expect(recommendations[1]).toMatchObject({ kind: "topic" });
  });

  it("offers new themes when the learner has no viewing history", () => {
    const recommendations = buildRecommendations(courses, [], 2);
    expect(recommendations.map(item => item.course.id)).toEqual([1, 2]);
    expect(recommendations.every(item => item.kind === "explore")).toBe(true);
  });

  it("prioritizes unseen courses aligned with a selected learning goal", () => {
    const recommendations = buildRecommendations(courses, [{ id: 1, progressPercent: 100, completed: true }], 3, "improve_lifestyle");
    expect(recommendations[0]).toMatchObject({ course: { id: 3 }, kind: "topic" });
    expect(recommendations[0]?.reason).toContain("食事・生活習慣を整える");
  });

  it("keeps space for a goal-aligned recommendation after the best continuation", () => {
    const recommendations = buildRecommendations(courses, [
      { id: 1, progressPercent: 20, completed: false },
      { id: 2, progressPercent: 10, completed: false },
    ], 3, "improve_lifestyle");
    expect(recommendations.map(item => item.course.id)).toEqual([1, 3, 4]);
    expect(recommendations[1]?.reason).toContain("食事・生活習慣を整える");
  });
});
