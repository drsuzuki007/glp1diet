export function toggleWishlistCourseId(courseIds: number[], courseId: number) {
  return courseIds.includes(courseId)
    ? courseIds.filter(id => id !== courseId)
    : [...courseIds, courseId];
}

export function isWishlistedCourse(courseIds: number[], courseId: number) {
  return courseIds.includes(courseId);
}

export function getWishlistedRecommendationIds(recommendations: Array<{ courseId: number; wishlisted: boolean }>) {
  return recommendations.filter(item => item.wishlisted).map(item => item.courseId);
}
