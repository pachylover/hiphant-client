import type { MediaAsset } from "./m3u8"
export class ClipNetworkError extends Error {
  constructor(public readonly status: number) { super(status === 403 || status === 401 ? "미디어 주소가 만료되었거나 접근할 수 없습니다." : "영상 다운로드 요청이 실패했습니다.") }
}
export interface DownloadContext {
  signal: AbortSignal
  maxBytes: number
  receivedBytes: number
  totalBytes?: number
  onBytes?: (bytes: number) => void
  abort?: () => void
}
export async function readAsset(asset: MediaAsset, context: DownloadContext, maxResponseBytes = context.maxBytes): Promise<Uint8Array> {
  context.signal.throwIfAborted()
  const url = new URL(asset.url)
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("HTTPS 미디어 주소만 지원합니다.")
  const response = await fetch(url, { signal: context.signal, credentials: "omit", referrerPolicy: "no-referrer", headers: asset.range ? { Range: `bytes=${asset.range.start}-${asset.range.end}` } : undefined })
  if (!response.ok) { await response.body?.cancel(); throw new ClipNetworkError(response.status) }
  if (asset.range) {
    // Some confirmed CDNs return 206 but do not expose Content-Range through
    // CORS. In that case require exactly the requested number of bytes. Never
    // accept a 200/full-file fallback; validate offsets when the header is visible.
    const contentRange = response.headers.get("content-range")
    const match = contentRange ? /^bytes (\d+)-(\d+)\/(?:\d+|\*)$/.exec(contentRange) : null
    if (response.status !== 206 || contentRange !== null && (!match || Number(match[1]) !== asset.range.start || Number(match[2]) !== asset.range.end)) {
      await response.body?.cancel(); throw new Error("서버가 정확한 Range 요청을 지원하지 않습니다.")
    }
    maxResponseBytes = Math.min(maxResponseBytes, asset.range.end - asset.range.start + 1)
  }
  const length = Number(response.headers.get("content-length"))
  if (length > maxResponseBytes || length > context.maxBytes - context.receivedBytes) { await response.body?.cancel(); throw new Error("영상이 브라우저 다운로드 용량 제한을 초과합니다. 화질이나 길이를 줄여주세요.") }
  const reader = response.body?.getReader()
  if (!reader) throw new Error("브라우저에서 스트리밍 다운로드를 사용할 수 없습니다.")
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      context.signal.throwIfAborted()
      const { value, done } = await reader.read(); if (done) break
      size += value.byteLength; context.receivedBytes += value.byteLength
      if (size > maxResponseBytes || context.receivedBytes > context.maxBytes) throw new Error("영상이 브라우저 다운로드 용량 제한을 초과합니다. 화질이나 길이를 줄여주세요.")
      chunks.push(value); context.onBytes?.(context.receivedBytes)
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error } finally { reader.releaseLock() }
  if (asset.range && size !== asset.range.end - asset.range.start + 1) throw new Error("영상 데이터가 일부 누락되었습니다.")
  const result = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}
export async function concurrentMap<T, R>(items: T[], run: (item: T, index: number) => Promise<R>, concurrency = 4, onFailure?: () => void): Promise<R[]> {
  const result = new Array<R>(items.length); let cursor = 0, failure: unknown
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.min(6, concurrency))) }, async () => {
    while (cursor < items.length && !failure) { const index = cursor++; try { result[index] = await run(items[index], index) } catch (error) { if (!failure) { failure = error; onFailure?.() } } }
  }))
  if (failure) throw failure
  return result
}
