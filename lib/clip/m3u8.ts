export interface MediaAsset { url: string; range?: { start: number; end: number } }
export interface MediaSegment extends MediaAsset { startSeconds: number; endSeconds: number; init: MediaAsset; period: number }
export interface MediaPlaylist { init: MediaAsset; segments: MediaSegment[] }
function mediaUrl(value: string, baseUrl: string): string {
  let url: URL
  try { url = new URL(value, baseUrl) } catch { throw new Error("미디어 주소가 올바르지 않습니다.") }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("HTTPS 미디어 주소만 지원합니다.")
  return url.href
}
function byteRange(value: string, previousEnd?: number) {
  const m = /^(\d+)(?:@(\d+))?$/.exec(value)
  if (!m) throw new Error("잘못된 HLS byte range입니다.")
  const length = Number(m[1]), start = m[2] === undefined ? previousEnd : Number(m[2])
  if (start === undefined || !Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length < 1 || !Number.isSafeInteger(start + length)) throw new Error("지원하지 않는 HLS byte range입니다.")
  return { start, end: start + length - 1 }
}
export function parseMediaPlaylist(text: string, baseUrl: string): MediaPlaylist {
  if (text.length > 2 * 1024 * 1024 || !text.trimStart().startsWith("#EXTM3U")) throw new Error("올바른 HLS 목록이 아닙니다.")
  if (!text.includes("#EXT-X-ENDLIST")) throw new Error("완료된 VOD만 다운로드할 수 있습니다.")
  let init: MediaAsset | undefined, firstInit: MediaAsset | undefined, period = 0, seconds = 0, pendingDuration: number | undefined, pendingRange: string | undefined
  const segments: MediaSegment[] = []
  for (const line of text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    if (/^#EXT-X-(?:STREAM-INF|MEDIA:|GAP|I-FRAMES-ONLY)/.test(line)) throw new Error("분리 트랙 또는 master HLS 목록은 지원하지 않습니다.")
    if (line.startsWith("#EXT-X-KEY:") && !/^#EXT-X-KEY:METHOD=NONE\s*$/.test(line)) throw new Error("암호화 또는 DRM 영상은 다운로드할 수 없습니다.")
    if (line === "#EXT-X-DISCONTINUITY") { period++; continue }
    if (line.startsWith("#EXT-X-MAP:")) {
      const uri = /(?:^|,)URI="([^"]+)"/.exec(line.slice(11))?.[1], range = /(?:^|,)BYTERANGE="([^"]+)"/.exec(line.slice(11))?.[1]
      if (!uri) throw new Error("HLS 초기화 주소가 없습니다.")
      const next = { url: mediaUrl(uri, baseUrl), ...(range ? { range: byteRange(range) } : {}) }
      if (init && JSON.stringify(init) !== JSON.stringify(next)) period++
      init = next
      firstInit ??= next
    } else if (line.startsWith("#EXTINF:")) {
      pendingDuration = Number(line.slice(8).split(",")[0])
      if (!Number.isFinite(pendingDuration) || pendingDuration <= 0) throw new Error("HLS 구간 길이가 올바르지 않습니다.")
    } else if (line.startsWith("#EXT-X-BYTERANGE:")) pendingRange = line.slice(17)
    else if (!line.startsWith("#")) {
      if (!init || pendingDuration === undefined) throw new Error("fMP4 HLS 초기화 또는 구간 정보가 없습니다.")
      const url = mediaUrl(line, baseUrl), previous = segments.at(-1)
      const range = pendingRange ? byteRange(pendingRange, previous?.url === url && previous.range ? previous.range.end + 1 : undefined) : undefined
      segments.push({ url, range, init, period, startSeconds: seconds, endSeconds: seconds + pendingDuration }); seconds += pendingDuration
      pendingDuration = undefined; pendingRange = undefined
    }
  }
  if (!init || !segments.length || pendingDuration !== undefined) throw new Error("HLS 미디어 구간을 찾을 수 없습니다.")
  return { init: firstInit!, segments }
}
export function selectSegments(playlist: MediaPlaylist, startSeconds: number, endSeconds: number) {
  const selected = playlist.segments.filter(s => s.endSeconds > startSeconds && s.startSeconds < endSeconds)
  if (!selected.length || startSeconds >= endSeconds || selected.at(-1)!.endSeconds + 0.001 < endSeconds) throw new Error("요청 범위가 영상 범위를 벗어났습니다.")
  if (selected.some(segment => segment.period !== selected[0].period)) throw new Error("영상 연결 지점을 포함한 구간입니다. 시작 또는 종료 시간을 조정해 주세요.")
  return selected
}
