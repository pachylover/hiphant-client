import { API_BASE_URL } from "../api"

export interface ClipRendition {
  id: string
  height: number
  mode: "HLS_FMP4" | "PROGRESSIVE_MP4"
  estimatedBytes: number | null
}

export interface ClipSession {
  sessionId: string
  expiresAt: string
  durationSeconds: number
  title: string
  channelName: string
  renditions: ClipRendition[]
}

export interface ClipSource {
  mode: "HLS_FMP4" | "PROGRESSIVE_MP4"
  url?: string
  playlist?: string
  baseUrl?: string
}

export class ClipSessionError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) {
    super(message)
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ClipSessionError(
      typeof body?.message === "string" ? body.message : "영상 정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      response.status,
      typeof body?.requestId === "string" ? body.requestId : undefined,
    )
  }
  if (!body) throw new ClipSessionError("영상 정보 응답을 읽을 수 없습니다.", 502)
  return body as T
}

export async function createClipSession(videoId: string, startSeconds: number, endSeconds: number, signal: AbortSignal, naverSession?: { nidAut: string; nidSes: string }): Promise<ClipSession> {
  return readResponse<ClipSession>(await fetch(`${API_BASE_URL}/v1/videos/${encodeURIComponent(videoId)}/clip-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "omit",
    signal,
    body: JSON.stringify({ startSeconds, endSeconds, ...(naverSession ? { naverSession } : {}) }),
  }))
}

export async function getClipSource(sessionId: string, renditionId: string, signal: AbortSignal): Promise<ClipSource> {
  return readResponse<ClipSource>(await fetch(`${API_BASE_URL}/v1/clip-sessions/${encodeURIComponent(sessionId)}/renditions/${encodeURIComponent(renditionId)}/manifest`, {
    cache: "no-store", credentials: "omit", signal,
  }))
}

export function selectRendition(session: ClipSession, preferredId: string, maxBytes: number): ClipRendition {
  const supported = session.renditions.filter(r => r.mode === "HLS_FMP4" || r.mode === "PROGRESSIVE_MP4")
  const selected = supported.find(r => r.id === preferredId)
    ?? supported.filter(r => r.estimatedBytes === null || r.estimatedBytes <= maxBytes).sort((a, b) => b.height - a.height)[0]
  if (!selected) throw new Error("지원되는 화질이 없거나 예상 파일이 용량 제한을 초과합니다.")
  if (selected.estimatedBytes !== null && selected.estimatedBytes > maxBytes) {
    throw new Error("예상 파일이 용량 제한을 초과합니다. 낮은 화질을 선택해주세요.")
  }
  return selected
}
