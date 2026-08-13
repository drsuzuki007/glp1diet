import { describe, expect, it } from "vitest";
import { getWishlistedRecommendationIds, isWishlistedCourse, toggleWishlistCourseId } from "../shared/wishlist";

describe("recommendation wishlist helpers", () => {
  it("adds a recommended course to the saved list without changing existing entries", () => {
    expect(toggleWishlistCourseId([4, 9], 12)).toEqual([4, 9, 12]);
    expect(isWishlistedCourse([4, 9, 12], 12)).toBe(true);
  });

  it("removes an already saved recommended course", () => {
    expect(toggleWishlistCourseId([4, 9, 12], 9)).toEqual([4, 12]);
    expect(isWishlistedCourse([4, 12], 9)).toBe(false);
  });

  it("hydrates recommendation cards from persisted server states after a reload", () => {
    const restored = getWishlistedRecommendationIds([
      { courseId: 6, wishlisted: false },
      { courseId: 12, wishlisted: true },
      { courseId: 18, wishlisted: false },
    ]);

    expect(restored).toEqual([12]);
    expect(toggleWishlistCourseId(restored, 12)).toEqual([]);
    expect(getWishlistedRecommendationIds([{ courseId: 12, wishlisted: true }])).toEqual([12]);
  });
});
