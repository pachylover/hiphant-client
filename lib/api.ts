// API 공통 유틸. 백엔드 응답은 { resultCode, resultMsg, ... } 래퍼를 사용한다.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

export interface ApiResponse {
  resultCode?: number
  resultMsg?: string
}

export interface PageResult<T> extends ApiResponse {
  page: number
  size: number
  total: number
  totalPages: number
  list: T[]
}

export interface ListResult<T> extends ApiResponse {
  count: number
  list: T[]
}

export interface DataResult<T> extends ApiResponse {
  data: T
}

// 채팅 검색 항목
export interface ChatSearchItem {
  id: number
  userId: string | null
  username: string | null
  message: string | null
  playerMessageTime: number | null
  seconds: number | null
}

// 배너
export interface Banner {
  id: number
  title: string | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

// 안내문구
export interface Announcement {
  id: number
  message: string
  level: string // INFO | WARNING | SUCCESS
  linkUrl: string | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

// 관리자 통계
export interface StatsResponse {
  totalVideos: number
  totalHighlights: number
  totalChats: number
  highlightsToday: number
  highlightsLast7Days: number
  dailyTrend: { date: string; count: number }[]
  topVideos: { videoId: string; highlightCount: number; maxChatCount: number }[]
}

// 최근 하이라이트
export interface RecentHighlight {
  id: number
  videoId: string
  /** 치지직 다시보기 제목. 백필 전 데이터는 null 일 수 있다. */
  videoTitle: string | null
  title: string | null
  chatCount: number | null
  highlightType: string | null
  minute: number | null
  createdAt: string | null
}

// 채팅 검색 매칭 방식: partial(부분 일치) | exact(정확히 일치)
export type ChatSearchMode = "partial" | "exact"

// 공개 채팅 검색
export async function searchChats(
  videoId: string,
  params: { keyword?: string; username?: string; mode?: ChatSearchMode; page?: number; size?: number },
): Promise<PageResult<ChatSearchItem>> {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set("keyword", params.keyword)
  if (params.username) qs.set("username", params.username)
  if (params.mode) qs.set("mode", params.mode)
  qs.set("page", String(params.page ?? 0))
  qs.set("size", String(params.size ?? 30))
  const res = await fetch(`${API_BASE_URL}/v1/chats/${encodeURIComponent(videoId)}?${qs.toString()}`)
  if (!res.ok) throw new Error(`채팅 검색 실패: ${res.status}`)
  return res.json()
}

// 공개 배너 조회
export async function fetchActiveBanners(): Promise<Banner[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/banners`, { cache: "no-store" })
    if (!res.ok) return []
    const body: ListResult<Banner> = await res.json()
    return body.list ?? []
  } catch {
    return []
  }
}

// 영상 섬네일 조회 (백엔드가 영상별로 캐시함). 없으면 null.
export async function fetchVideoThumbnail(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/videos/${encodeURIComponent(videoId)}`, { cache: "no-store" })
    if (!res.ok) return null
    const body = await res.json()
    const d = body?.data ?? body
    return d?.thumbnailImageUrl ?? d?.thumbnail ?? d?.thumbnailUrl ?? null
  } catch {
    return null
  }
}

// 공개 홈용: 최근 생성된 하이라이트 (영상별 최신 1건)
export async function fetchRecentHighlights(limit = 6): Promise<RecentHighlight[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/highlights/recent?limit=${limit}`, { cache: "no-store" })
    if (!res.ok) return []
    const body: ListResult<RecentHighlight> = await res.json()
    return body.list ?? []
  } catch {
    return []
  }
}

// 공개 안내문구 조회
export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/announcements`, { cache: "no-store" })
    if (!res.ok) return []
    const body: ListResult<Announcement> = await res.json()
    return body.list ?? []
  } catch {
    return []
  }
}

// 분당 채팅량 그래프 데이터
export interface ChatTimelinePoint {
  /** 영상 시작 기준 분 */
  minute: number
  /** 해당 구간 시작 초 (다시보기 currentTime) */
  seconds: number
  /** 축 라벨 (H:MM) */
  label: string
  count: number
}

export interface ChatTimeline {
  videoId: string
  totalChats: number
  peakCount: number
  processing: boolean
  points: ChatTimelinePoint[]
}

// 진행 상황 스트리밍 이벤트 (SSE)
export type ProgressPhase = "START" | "FETCH_CHATS" | "SAVE_CHATS" | "ANALYZE" | "DONE" | "ERROR"

export interface ProgressEvent {
  videoId: string
  phase: ProgressPhase
  message: string
  percent: number
  chatCount: number | null
  highlightCount: number | null
  at: string
}

// 분당 채팅량 조회. 실패하면 null (그래프 섹션을 숨긴다).
export async function fetchChatTimeline(videoId: string): Promise<ChatTimeline | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/chats/${encodeURIComponent(videoId)}/timeline`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const body: DataResult<ChatTimeline> = await res.json()
    return body.data ?? null
  } catch {
    return null
  }
}

/**
 * 채팅 다시 불러오기 요청. 서버는 202 를 주고 백그라운드로 수집하며,
 * 진행 상황과 성공/실패는 subscribeProgress 로 전달된다.
 */
export async function requestChatReload(videoId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/v1/chats/${encodeURIComponent(videoId)}/reload`, {
    method: "POST",
  })
  if (res.status === 202) return
  const body = await res.json().catch(() => ({}))
  throw new Error((body as ApiResponse)?.resultMsg || `채팅을 불러올 수 없습니다. (${res.status})`)
}

/**
 * 하이라이트 생성 / 채팅 재수집의 진행 상황 구독(SSE).
 * 반환값을 호출하면 연결을 닫는다.
 */
export function subscribeProgress(
  videoId: string,
  handlers: { onProgress?: (e: ProgressEvent) => void; onError?: () => void },
): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {}
  }

  const source = new EventSource(`${API_BASE_URL}/v1/highlights/${encodeURIComponent(videoId)}/stream`)

  const handle = (event: MessageEvent) => {
    try {
      handlers.onProgress?.(JSON.parse(event.data) as ProgressEvent)
    } catch {
      // 형식이 깨진 이벤트는 무시한다
    }
  }

  source.addEventListener("progress", handle as EventListener)
  source.onerror = () => {
    // 서버가 작업 완료 후 스트림을 닫으면 여기로 들어온다. 재연결은 하지 않는다.
    source.close()
    handlers.onError?.()
  }

  return () => source.close()
}
