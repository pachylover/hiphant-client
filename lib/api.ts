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
