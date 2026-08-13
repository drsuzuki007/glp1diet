export type LearningActivityEvent = {
  courseId?: number;
  recordedAt: Date;
  watchedSeconds: number;
  completed: boolean;
};

export type LegacyLearningProgress = {
  courseId: number;
  durationMinutes: number;
  progressPercent: number;
  completed: boolean;
  updatedAt: Date;
};

export type MonthlyLearningMetric = {
  key: string;
  label: string;
  watchedMinutes: number;
  completedCount: number;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Converts one existing saved position per course into a baseline event only when no granular activity exists. */
export function mergeHistoricalProgressForReport(events: LearningActivityEvent[], progressRows: LegacyLearningProgress[]): LearningActivityEvent[] {
  const coursesWithActivity = new Set(events.flatMap(event => event.courseId === undefined ? [] : [event.courseId]));
  const legacyEvents = progressRows.filter(progress => progress.progressPercent > 0 && !coursesWithActivity.has(progress.courseId)).map(progress => ({
    courseId: progress.courseId,
    recordedAt: progress.updatedAt,
    watchedSeconds: Math.round(progress.durationMinutes * 60 * Math.min(100, Math.max(0, progress.progressPercent)) / 100),
    completed: progress.completed,
  }));
  return [...events, ...legacyEvents];
}

export function buildMonthlyLearningReport(events: LearningActivityEvent[], now = new Date(), monthCount = 6): MonthlyLearningMetric[] {
  const months = Array.from({ length: monthCount }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - offset), 1);
    return { key: monthKey(date), label: `${date.getMonth() + 1}月`, watchedMinutes: 0, completedCount: 0 };
  });
  const watchedSecondsByMonth = new Map(months.map(month => [month.key, 0]));
  const byMonth = new Map(months.map(month => [month.key, month]));
  for (const event of events) {
    const metric = byMonth.get(monthKey(event.recordedAt));
    if (!metric) continue;
    watchedSecondsByMonth.set(metric.key, (watchedSecondsByMonth.get(metric.key) ?? 0) + Math.max(0, event.watchedSeconds));
    if (event.completed) metric.completedCount += 1;
  }
  for (const month of months) {
    const watchedSeconds = watchedSecondsByMonth.get(month.key) ?? 0;
    month.watchedMinutes = watchedSeconds > 0 ? Math.ceil(watchedSeconds / 6) / 10 : 0;
  }
  return months;
}
