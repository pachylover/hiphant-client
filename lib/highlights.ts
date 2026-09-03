// 영상/하이라이트 응답 정규화. 서버 컴포넌트(초기 HTML)와 클라이언트(갱신)가
// 같은 함수를 써야 하이드레이션 불일치가 생기지 않는다.

import { API_BASE_URL } from "./api"

export interface NormalizedHighlight {
  id: number | string
  timestamp: string
  title: string
  seconds: number
  videoId: string
  highlightType: string
  raw: any
}

export interface NormalizedVideoInfo {
  thumbnailImageUrl: string
  channel: { channelName: string }
  publishDate: string
  duration: number
  videoTitle: string
  /** 하단 "이 스트리머의 다른 하이라이트" 섹션에서 사용 */
  channelId: string | null
  _raw: any
}

export interface VideoAndHighlights {
  videoInfo: NormalizedVideoInfo | null
  highlights: NormalizedHighlight[]
  /** 백엔드가 알려준 상태. 202 면 생성이 진행 중이다. */
  resultCode: number | null
}

/** 한국어 형식(duration 문자열)을 초 단위 정수로 변환합니다. (예: "2시간 34분" -> 9240) */
export function parseKoreanDuration(s: string | number | undefined): number | null {
  if (!s) return null
  if (typeof s === "number") return s
  const hourMatch = String(s).match(/(\d+)\s*시간/)
  const minMatch = String(s).match(/(\d+)\s*분/)
  const secMatch = String(s).match(/(\d+)\s*초/)
  let seconds = 0
  if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600
  if (minMatch) seconds += parseInt(minMatch[1], 10) * 60
  if (secMatch) seconds += parseInt(secMatch[1], 10)
  return seconds || null
}

/** 초 단위를 'HH:MM:SS' 또는 'MM:SS' 문자열로 포맷합니다. */
export function formatToHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(String(h).padStart(2, "0"))
  parts.push(String(m).padStart(2, "0"))
  parts.push(String(s).padStart(2, "0"))
  return parts.join(":")
}

/** HH:MM:SS 문자열을 초로 변환 */
function parseHHMMSS(timeStr: string): number | null {
  if (!timeStr) return null
  const parts = String(timeStr).split(":").map((p) => Number(p))
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

export function normalizeVideoInfo(videoContent: any): NormalizedVideoInfo {
  return {
    thumbnailImageUrl: videoContent.thumbnail || videoContent.thumbnailUrl || videoContent.thumbnailImageUrl,
    channel: { channelName: videoContent.channelName || videoContent.channel?.channelName || "알 수 없음" },
    publishDate: videoContent.createdAt || videoContent.publishDate || "",
    duration:
      typeof videoContent.duration === "number"
        ? videoContent.duration
        : parseKoreanDuration(videoContent.duration) ?? 0,
    videoTitle: videoContent.title || videoContent.videoTitle || "",
    channelId: videoContent.channel?.channelId ?? null,
    _raw: videoContent,
  }
}

export function normalizeHighlights(
  videoId: string,
  videoContent: any,
  rawHighlights: any[],
): NormalizedHighlight[] {
  const durationSec =
    typeof videoContent?.duration === "number"
      ? videoContent.duration
      : parseKoreanDuration(videoContent?.duration) ?? 0

  return (Array.isArray(rawHighlights) ? rawHighlights : []).map((rawHighlight: any, idx: number) => {
    const fmt = (s: number) => formatToHHMMSS(Math.max(0, Math.floor(s)))

    // 우선순위: minute(ms) -> numeric timestamp(seconds) -> formatted string -> fallback
    let secondsValue: number | null = null

    // 1) minute (밀리초 오프셋) 처리
    if (rawHighlight.minute !== undefined && rawHighlight.minute !== null) {
      const minuteMs = Number(rawHighlight.minute)
      if (!isNaN(minuteMs)) {
        secondsValue = Math.max(0, Math.min(durationSec, Math.floor(minuteMs / 1000)))
      }
    }

    // 2) numeric timestamp (이미 초 단위로 들어온 경우)
    if (secondsValue === null && typeof rawHighlight.timestamp === "number") {
      secondsValue = Math.max(0, Math.min(durationSec, Math.floor(rawHighlight.timestamp)))
    }

    // 3) timestamp 문자열 (HH:MM:SS 등)
    if (secondsValue === null && typeof rawHighlight.timestamp === "string") {
      const parsed = parseHHMMSS(rawHighlight.timestamp)
      if (parsed !== null) secondsValue = Math.max(0, Math.min(durationSec, parsed))
    }

    // 4) fallback: rawHighlight.time
    if (secondsValue === null && (rawHighlight.time || rawHighlight.start || rawHighlight.end)) {
      const candidate = rawHighlight.time ?? rawHighlight.start ?? rawHighlight.end
      if (typeof candidate === "number") {
        // start/end 가 epoch ms 면 영상 시작 기준 오프셋으로 바꾼다
        if (String(candidate).length >= 12) {
          const videoStartMs = Number(
            videoContent?.publishDateAt ??
              videoContent?.createdAtAt ??
              Date.parse(videoContent?.publishDate ?? videoContent?.createdAt ?? ""),
          )
          if (!isNaN(videoStartMs)) {
            const offsetSec = Math.round((Number(candidate) - videoStartMs) / 1000)
            secondsValue = Math.max(0, Math.min(durationSec, offsetSec))
          } else {
            secondsValue = Math.max(0, Math.min(durationSec, Math.floor(Number(candidate) / 1000)))
          }
        } else {
          secondsValue = Math.max(0, Math.min(durationSec, Math.floor(Number(candidate))))
        }
      } else if (typeof candidate === "string") {
        const parsed = parseHHMMSS(candidate)
        if (parsed !== null) secondsValue = Math.max(0, Math.min(durationSec, parsed))
      }
    }

    const displayTimestamp =
      secondsValue !== null
        ? fmt(secondsValue)
        : typeof rawHighlight.timestamp === "string"
          ? rawHighlight.timestamp
          : "00:00:00"

    return {
      // DB PK가 bigserial 이면 숫자(id)가 들어온다 — 가능하면 숫자로 유지한다
      id: typeof rawHighlight.id === "number" ? rawHighlight.id : rawHighlight.taskId ?? rawHighlight.id ?? String(idx + 1),
      timestamp: displayTimestamp,
      title: rawHighlight.title ?? rawHighlight.summary ?? rawHighlight.name ?? "하이라이트",
      seconds: secondsValue ?? 0,
      videoId,
      highlightType: rawHighlight.highlightType ?? "NORMAL",
      raw: rawHighlight,
    }
  })
}

/**
 * 영상 정보 + 하이라이트를 함께 읽어 정규화한다.
 *
 * `revalidate` 를 주면(서버 렌더링) 그 초만큼 캐시하고, 주지 않으면 매번 새로 읽는다(클라이언트).
 * 실패하면 videoInfo 가 null 인 결과를 돌려준다 — 호출측이 생성 버튼을 띄운다.
 */
export async function fetchVideoAndHighlights(
  videoId: string,
  options: { revalidate?: number } = {},
): Promise<VideoAndHighlights> {
  const init: RequestInit =
    options.revalidate !== undefined
      ? ({ next: { revalidate: options.revalidate } } as RequestInit)
      : { cache: "no-store" }

  try {
    const [videoRes, highlightsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/v1/videos/${encodeURIComponent(videoId)}`, init),
      fetch(`${API_BASE_URL}/v1/highlights/${encodeURIComponent(videoId)}`, init),
    ])

    if (!videoRes.ok) throw new Error("비디오 정보를 가져오는 중 오류가 발생했습니다")

    const videoBody = await videoRes.json()
    const videoContent = videoBody.data ?? videoBody

    // 하이라이트 응답: 서버가 resultCode(200/202/404)를 바디로 보낼 수 있음
    const highlightsBody = await highlightsRes.json()
    const resultCode = Number(highlightsBody?.resultCode ?? highlightsRes.status ?? 200)
    const rawHighlights =
      highlightsBody?.list ?? highlightsBody?.content ?? (Array.isArray(highlightsBody) ? highlightsBody : [])

    return {
      videoInfo: normalizeVideoInfo(videoContent),
      highlights: normalizeHighlights(videoId, videoContent, rawHighlights),
      resultCode,
    }
  } catch (err) {
    console.error(err)
    return { videoInfo: null, highlights: [], resultCode: null }
  }
}
