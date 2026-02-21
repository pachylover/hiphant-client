"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import NoticePopup from "@/components/notice-popup"

export default function HomePage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsLoading(true)

    const videoId = url.split("/").pop()
    if (!videoId) {
      setIsLoading(false)
      alert("유효한 치지직 다시보기 URL을 입력하세요")
      return
    }

    // 처리 완료 후 결과 페이지로 이동
    setTimeout(() => {
      router.push(`/video/${videoId}`)
    }, 500)
  }

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 mx-auto">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            하이라이트 타임라인을
            <br />
            <span className="text-accent">자동으로 생성</span>합니다
          </h1>

          <p className="text-lg text-muted-foreground text-pretty">
            치지직 다시보기 URL을 입력하시면 채팅이 많았던 구간을 찾습니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </div>
      <NoticePopup />
    </div>
  )
}

function isValidUrl(url: string): boolean {
  // 유효한 치지직 URL인 지 확인
  // URL은 https://chzzk.naver.com/video/{videoId} 형식이어야 함

  try {
    const parsedUrl = new URL(url)
    return (
      parsedUrl.hostname === "chzzk.naver.com" &&
      parsedUrl.pathname.startsWith("/video/")
    )
  } catch {
    return false
  }
}