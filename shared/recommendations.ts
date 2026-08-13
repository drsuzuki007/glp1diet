export type RecommendableCourse = {
  id: number;
  slug: string;
  title: string;
  durationMinutes: number;
  publishedAt: Date;
  category: { id: number; slug: string; name: string };
};

export type LearnerProgress = {
  id: number;
  progressPercent: number;
  completed: boolean;
};

export type CourseRecommendation<T extends RecommendableCourse = RecommendableCourse> = {
  course: T;
  reason: string;
  kind: "continue" | "topic" | "explore";
};

/** Produces transparent, deterministic recommendations using only a learner's own saved viewing state. */
export function buildRecommendations<T extends RecommendableCourse>(catalog: T[], progressRows: LearnerProgress[], limit = 3, goalValues?: readonly LearningGoalValue[] | null): CourseRecommendation<T>[] {
  const goals = findLearningGoals(goalValues);
  const goalCategorySlugs = new Set<string>(goals.map(goal => goal.categorySlug));
  const byCourseId = new Map(progressRows.map(progress => [progress.id, progress]));
  const categoryScore = new Map<number, number>();
  for (const progress of progressRows) {
    const course = catalog.find(item => item.id === progress.id);
    if (!course) continue;
    categoryScore.set(course.category.id, (categoryScore.get(course.category.id) ?? 0) + (progress.completed ? 3 : 1));
  }
  const inProgress = catalog.filter(course => {
    const progress = byCourseId.get(course.id);
    return progress && progress.progressPercent > 0 && !progress.completed;
  }).sort((left, right) => (byCourseId.get(right.id)?.progressPercent ?? 0) - (byCourseId.get(left.id)?.progressPercent ?? 0));
  const unseen = catalog.filter(course => !byCourseId.has(course.id));
  const scoredUnseen = unseen.sort((left, right) => {
    const goalDifference = Number(goalCategorySlugs.has(right.category.slug)) - Number(goalCategorySlugs.has(left.category.slug));
    if (goalDifference) return goalDifference;
    const scoreDifference = (categoryScore.get(right.category.id) ?? 0) - (categoryScore.get(left.category.id) ?? 0);
    return scoreDifference || right.publishedAt.getTime() - left.publishedAt.getTime();
  });
  const selected: CourseRecommendation<T>[] = [];
  const selectedCourseIds = new Set<number>();
  const appendRecommendation = (course: T) => {
    const hasThemeHistory = (categoryScore.get(course.category.id) ?? 0) > 0;
    const matchingGoals = goals.filter(goal => goal.categorySlug === course.category.slug);
    const goalMatch = matchingGoals.length > 0;
    const goalLabels = matchingGoals.map(goal => goal.label).join("・");
    selected.push({ course, kind: goalMatch || hasThemeHistory ? "topic" : "explore", reason: goalMatch ? `学習目標「${goalLabels}」に沿って、次に理解を深める講座です。` : hasThemeHistory ? `「${course.category.name}」を学んだ流れで、次の理解につながる講座です。` : "これまでの学びを広げる新しいテーマの講座です。" });
    selectedCourseIds.add(course.id);
  };
  // Keep the strongest continuation while reserving space for goal-aligned next steps.
  for (const course of inProgress.slice(0, 1)) {
    const progress = byCourseId.get(course.id)!;
    selected.push({ course, kind: "continue", reason: `現在${progress.progressPercent}%まで視聴済みです。続きから学びましょう。` });
    selectedCourseIds.add(course.id);
    if (selected.length === limit) return selected;
  }
  // Reserve one recommendation per selected goal before filling remaining capacity.
  for (const goal of goals) {
    const course = scoredUnseen.find(candidate => candidate.category.slug === goal.categorySlug && !selectedCourseIds.has(candidate.id));
    if (course) appendRecommendation(course);
    if (selected.length === limit) return selected;
  }
  for (const course of scoredUnseen) {
    if (selectedCourseIds.has(course.id)) continue;
    appendRecommendation(course);
    if (selected.length === limit) return selected;
  }
  return selected;
}
import { findLearningGoals, type LearningGoalValue } from "./learningGoals";
