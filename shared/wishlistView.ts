import { findLearningGoal, type LearningGoalValue } from "./learningGoals";

export type WishlistSort = "savedNewest" | "goalPriority";
export type WishlistFilter = "all" | "unwatched" | "inProgress";

export type WishlistViewCourse = {
  id: number;
  savedAt?: Date | string | null;
  progressPercent?: number | null;
  category: { slug: string };
};

export type WishlistGoal = { goal: LearningGoalValue; priority: number };

function savedTime(course: WishlistViewCourse) {
  return course.savedAt ? new Date(course.savedAt).getTime() : 0;
}

function status(course: WishlistViewCourse) {
  const progress = course.progressPercent ?? 0;
  if (progress <= 0) return "unwatched" as const;
  if (progress < 100) return "inProgress" as const;
  return "completed" as const;
}

export function getWishlistView<T extends WishlistViewCourse>(
  courses: T[],
  goals: WishlistGoal[],
  sort: WishlistSort,
  filter: WishlistFilter,
) {
  const priorityByCategory = new Map<string, number>(
    goals.flatMap(item => {
      const goal = findLearningGoal(item.goal);
      return goal ? [[goal.categorySlug, item.priority] as const] : [];
    }),
  );

  const matchingCourses = courses.filter(course => filter === "all" || status(course) === filter);

  return [...matchingCourses].sort((left, right) => {
    if (sort === "goalPriority") {
      const priorityDifference = (priorityByCategory.get(left.category.slug) ?? Number.MAX_SAFE_INTEGER) - (priorityByCategory.get(right.category.slug) ?? Number.MAX_SAFE_INTEGER);
      if (priorityDifference !== 0) return priorityDifference;
    }
    return savedTime(right) - savedTime(left);
  });
}
