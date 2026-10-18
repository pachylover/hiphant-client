/** Editable ranges must be exact whole seconds; do not silently change typed values. */
export function isValidClipRange(start: number, end: number, duration?: number | null): boolean {
  return Number.isSafeInteger(start) && Number.isSafeInteger(end)
    && start >= 0 && end > start && end - start <= 600
    && (!duration || end <= duration)
}

export function stepClipTime(value: number, deltaY: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, (Number.isFinite(value) ? value : minimum)
    + (deltaY === 0 ? 0 : deltaY < 0 ? 1 : -1)))
}

export function formatClipTime(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) return ""
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60]
    .map(part => String(part).padStart(2, "0")).join(":")
}

export function parseClipTime(value: string): number {
  const match = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(value.trim())
  if (!match) return NaN
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  return Number.isSafeInteger(seconds) ? seconds : NaN
}
