import { describe, expect, it } from "vitest";
import { getWishlistView } from "../shared/wishlistView";

const courses = [
  { id: 1, savedAt: new Date("2026-08-01"), progressPercent: 0, category: { slug: "glp1-basics" } },
  { id: 2, savedAt: new Date("2026-08-03"), progressPercent: 40, category: { slug: "food-lifestyle" } },
  { id: 3, savedAt: new Date("2026-08-02"), progressPercent: 0, category: { slug: "food-lifestyle" } },
  { id: 4, savedAt: new Date("2026-08-04"), progressPercent: 100, category: { slug: "metabolic-health" } },
];

describe("getWishlistView", () => {
  it("sorts saved courses by most-recent save time", () => {
    expect(getWishlistView(courses, [], "savedNewest", "all").map(course => course.id)).toEqual([4, 2, 3, 1]);
  });

  it("puts courses that match high-priority learning goals first", () => {
    const goals = [
      { goal: "improve_lifestyle" as const, priority: 1 },
      { goal: "understand_glp1" as const, priority: 2 },
    ];
    expect(getWishlistView(courses, goals, "goalPriority", "all").map(course => course.id)).toEqual([2, 3, 1, 4]);
  });

  it("filters saved courses by unwatched and in-progress state", () => {
    expect(getWishlistView(courses, [], "savedNewest", "unwatched").map(course => course.id)).toEqual([3, 1]);
    expect(getWishlistView(courses, [], "savedNewest", "inProgress").map(course => course.id)).toEqual([2]);
  });
});
