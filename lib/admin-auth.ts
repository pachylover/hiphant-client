// 관리자 인증 유틸. JWT 토큰을 localStorage 에 저장하고 Bearer 헤더로 첨부한다.

import { API_BASE_URL, type ApiResponse } from "./api"

const TOKEN_KEY = "hiphant_admin_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
}

export interface LoginResult extends ApiResponse {
  token: string
  username: string
  role: string
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE_URL}/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.resultMsg || "로그인에 실패했습니다.")
  }
  return body as LoginResult
}

export class AuthError extends Error {}

// 인증이 필요한 관리자 API 호출. 401/403 이면 AuthError 를 던진다.
export async function adminFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" })

  if (res.status === 401 || res.status === 403) {
    clearToken()
    throw new AuthError("인증이 만료되었습니다. 다시 로그인해주세요.")
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((body as any)?.resultMsg || `요청 실패: ${res.status}`)
  }
  return body as T
}

// 토큰 유효성 확인
export async function verifyToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  try {
    await adminFetch("/v1/admin/auth/me")
    return true
  } catch {
    return false
  }
}
