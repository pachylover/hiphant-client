"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)

    // Mock: Extract video ID from URL
    // In real implementation, this would call an API
    const videoId = "demo-video-123"

    setTimeout(() => {
      router.push(`/video/${videoId}`)
    }, 500)
  }

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 mx-auto">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            하이라이트 타임스탬프를
            <br />
            <span className="text-accent">자동으로 생성</span>하세요
          </h1>

          <p className="text-lg text-muted-foreground text-pretty">
            인터넷 방송 다시보기 URL을 입력하면 AI가 자동으로 하이라이트 구간을 찾아드립니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Video URL을 입력하세요"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-14 pr-14 text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-12 w-12 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isLoading || !url.trim()}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? "분석 중..." : "하이라이트 찾기"}
          </Button>
        </form>

        <div className="grid gap-4 pt-8 sm:grid-cols-3">
          <div className="space-y-2 text-center">
            <div className="text-3xl font-bold text-accent">AI 분석</div>
            <p className="text-sm text-muted-foreground">자동 하이라이트 추출</p>
          </div>

          <div className="space-y-2 text-center">
            <div className="text-3xl font-bold text-accent">빠른 처리</div>
            <p className="text-sm text-muted-foreground">몇 초 만에 결과 확인</p>
          </div>

          <div className="space-y-2 text-center">
            <div className="text-3xl font-bold text-accent">정확한 타임스탬프</div>
            <p className="text-sm text-muted-foreground">정확한 시간 정보 제공</p>
          </div>
        </div>
      </div>
    </div>
  )
}
