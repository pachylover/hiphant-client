import { parseMediaPlaylist, selectSegments } from "./m3u8"
import { concurrentMap, DownloadContext, readAsset } from "./network"
import { packageFmp4 } from "./fmp4"
import { downloadProgressive } from "./progressive-mp4"
export { ClipNetworkError } from "./network"
export interface ClipSource { mode: "HLS_FMP4" | "PROGRESSIVE_MP4"; url?: string; playlist?: string; baseUrl?: string }
export interface ClipProgress { phase: "ANALYZING" | "DOWNLOADING" | "PACKAGING"; completed: number; total: number }
export interface ClipDownloadOptions {
  source: ClipSource
  startSeconds: number
  endSeconds: number
  signal: AbortSignal
  maxBytes: number
  onProgress?: (progress: ClipProgress) => void
}
export async function downloadClip({ source, startSeconds, endSeconds, signal, maxBytes, onProgress }: ClipDownloadOptions) {
  if (![startSeconds, endSeconds, maxBytes].every(Number.isFinite) || startSeconds < 0 || endSeconds <= startSeconds || endSeconds - startSeconds > 600 || maxBytes <= 0 || maxBytes > 1024 ** 3) throw new Error("다운로드 구간 또는 용량 제한이 올바르지 않습니다.")
  signal.throwIfAborted()
  const controller = new AbortController(), abort = () => controller.abort(signal.reason)
  signal.addEventListener("abort", abort, { once: true })
  const progress = (phase: ClipProgress["phase"], completed = 0, total = 0) => onProgress?.({ phase, completed, total })
  const context: DownloadContext = { signal: controller.signal, maxBytes, receivedBytes: 0, abort: () => controller.abort(), onBytes: completed => progress("DOWNLOADING", completed, context.totalBytes ?? 0) }
  try {
    progress("ANALYZING")
    if (source.mode === "PROGRESSIVE_MP4") {
      if (!source.url) throw new Error("MP4 미디어 주소가 없습니다.")
      return await downloadProgressive(source.url, startSeconds, endSeconds, context, () => progress("PACKAGING"))
    }
    if (source.mode !== "HLS_FMP4" || !source.playlist || !source.baseUrl) throw new Error("지원하지 않는 미디어 형식입니다.")
    const playlist = parseMediaPlaylist(source.playlist, source.baseUrl), segments = selectSegments(playlist, startSeconds, endSeconds)
    if (segments.at(-1)!.endSeconds - segments[0].startSeconds > 600) throw new Error("세그먼트 경계 보정 후 길이가 10분을 초과합니다. 요청 구간을 줄여주세요.")
    context.onBytes = undefined
    const init = await readAsset(playlist.init, context, Math.min(maxBytes, 32 * 1024 * 1024))
    let completed = 0
    const data = await concurrentMap(segments, async segment => { const result = await readAsset(segment, context); progress("DOWNLOADING", ++completed, segments.length); return result }, 4, context.abort)
    controller.signal.throwIfAborted(); progress("PACKAGING")
    const actualStart = segments[0].startSeconds, actualEnd = segments.at(-1)!.endSeconds
    return { blob: packageFmp4(init, data, actualEnd - actualStart), startSeconds: actualStart, endSeconds: actualEnd, extension: "mp4" as const }
  } finally { controller.abort(); signal.removeEventListener("abort", abort) }
}
