"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { VideoInfoCard } from "@/components/video-info-card"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { Sparkles, Search } from "lucide-react"

// Mock data - In real implementation, this would come from an API
const mockVideoData = {
  "demo-video-123": {
    thumbnail: "/streaming-video-thumbnail.png",
    channelName: "인기 스트리머",
    createdAt: "2025년 1월 10일",
    duration: "2시간 34분",
    title: "재미있는 게임 방송 다시보기",
  },
}

export default function VideoPage() {
  const router = useRouter()
  const params = useParams()
  const videoId = params.videoId as string

  const [isLoading, setIsLoading] = useState(true)
  const [videoData, setVideoData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const data = mockVideoData[videoId as keyof typeof mockVideoData]
      setVideoData(data || null)
      setIsLoading(false)
    }, 1000)
  }, [videoId])

  const handleGenerateHighlights = () => {
    setIsGenerating(true)
    setTimeout(() => {
      router.push(`/highlights/${videoId}`)
    }, 1500)
  }

  if (isLoading) {
    return (
      <div className="container py-12 mx-auto">
        <div className="mx-auto max-w-2xl space-y-6">
          <VideoInfoSkeleton />
        </div>
      </div>
    )
  }

  if (!videoData) {
    return (
      <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 mx-auto">
        <div className="max-w-md space-y-6 text-center">
          <div className="text-6xl">😢</div>
          <h1 className="text-3xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">다시보기를 찾지 못했어요 :(</p>
          <Button
            size="lg"
            onClick={() => router.push("/")}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Search className="mr-2 h-5 w-5" />
            다시 찾기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 mx-auto">
      <div className="mx-auto max-w-2xl space-y-6">
        <VideoInfoCard {...videoData} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleGenerateHighlights}
            disabled={isGenerating}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {isGenerating ? "생성 중..." : "하이라이트 생성하기"}
          </Button>

          <Button size="lg" variant="outline" onClick={() => router.push("/")}>
            <Search className="mr-2 h-5 w-5" />
            다시 찾기
          </Button>
        </div>
      </div>
    </div>
  )
}
