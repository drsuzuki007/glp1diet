export const learningGoals = [
  { value: "understand_glp1", label: "GLP-1の基礎を知る", description: "作用・治療の考え方・注意点を一般知識として学ぶ", categorySlug: "glp1-basics" },
  { value: "improve_lifestyle", label: "食事・生活習慣を整える", description: "食事・運動・続けやすい日常の工夫を学ぶ", categorySlug: "food-lifestyle" },
  { value: "understand_checks", label: "健診結果を理解する", description: "血糖・代謝・心臓や腎臓との関係を学ぶ", categorySlug: "metabolic-health" },
  { value: "prepare_for_visit", label: "受診前の準備をする", description: "相談時に整理したい情報と質問を学ぶ", categorySlug: "care-prep" },
] as const;

export type LearningGoalValue = (typeof learningGoals)[number]["value"];

export function findLearningGoal(value: LearningGoalValue | null | undefined) {
  return learningGoals.find(goal => goal.value === value) ?? null;
}

export function findLearningGoals(values: readonly LearningGoalValue[] | null | undefined) {
  const selected = new Set(values ?? []);
  return learningGoals.filter(goal => selected.has(goal.value));
}
