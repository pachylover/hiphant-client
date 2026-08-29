"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BannerCarousel } from "@/components/banner-carousel"
import { RecentHighlights } from "@/components/recent-highlights"
import { Search } from "lucide-react"

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
    <div className="container mx-auto flex flex-col items-center gap-16 py-12">
      <div className="flex min-h-[55vh] w-full max-w-3xl flex-col justify-center gap-8">
        <BannerCarousel />

        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            <span className="text-accent">HiPhant</span><br/>
            치지직 하이라이트 분석기
          </h1>

          <p className="text-lg text-muted-foreground text-pretty">
            치지직 다시보기 URL을 입력하여 하이라이트를 찾아보세요
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

          <p className="text-center text-sm leading-relaxed text-muted-foreground text-pretty">
            치지직 다시보기 채팅 내역을 분석하여 채팅이 많았던 구간을 찾습니다.
            <br className="hidden sm:block" />{" "}
            하이라이트 찾기 후 생성을 통해 하이라이트를 만들어보세요.
          </p>
        </form>
      </div>

      <div className="w-full max-w-5xl">
        <RecentHighlights />
      </div>
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
