export function calculateVideoProgress(currentTime: number, duration: number) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Math.max(0, currentTime) / duration) * 100)));
}

export function progressForSaving(currentTime: number, duration: number, displayedProgress = 0) {
  const playbackProgress = calculateVideoProgress(currentTime, duration);
  return Math.min(100, Math.max(10, playbackProgress || displayedProgress || 18));
}
