"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingOverlay } from "@/components/loading-state"
import { Search } from "lucide-react"

function isValidUrl(url: string): boolean {
  // 유효한 치지직 URL인 지 확인
  // URL은 https://chzzk.naver.com/video/{videoId} 형식이어야 함
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === "chzzk.naver.com" && parsedUrl.pathname.startsWith("/video/")
  } catch {
    return false
  }
}

/** 홈의 URL 입력 폼. 홈 자체는 서버 렌더링되고 이 부분만 클라이언트에서 동작한다. */
export function VideoUrlForm() {
  const [url, setUrl] = useState("")
  const [isLoading, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !isValidUrl(url)) return
    const videoId = new URL(url).pathname.split("/")[2]
    if (!videoId) return
    startTransition(() => router.push(`/video/${encodeURIComponent(videoId)}`))
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isLoading} className="space-y-4">
      {isLoading && <LoadingOverlay label="방송 분석 화면으로 이동하는 중입니다" />}
      <div className="relative">
        <Input
          type="text"
          placeholder="치지직 다시보기 URL을 입력하세요"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-14 pr-14 text-base"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-1 top-1 h-12 w-12 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
          disabled={isLoading || !url.trim() || !isValidUrl(url)}
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
        disabled={isLoading || !url.trim() || !isValidUrl(url)}
      >
        {isLoading ? "분석 중..." : "하이라이트 찾기"}
      </Button>

      <p className="text-center text-sm leading-relaxed text-muted-foreground text-pretty">
        치지직 다시보기 채팅 내역을 분석하여 채팅이 많았던 구간을 찾습니다.
        <br className="hidden sm:block" />{" "}
        하이라이트 찾기 후 생성을 통해 하이라이트를 만들어보세요.
      </p>
    </form>
  )
}
