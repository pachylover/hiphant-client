"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { VideoInfoCard } from "@/components/video-info-card"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { HighlightList } from "@/components/highlight-list"
import { HighlightListSkeleton } from "@/components/highlight-list-skeleton"

// Mock data
const mockVideoData = {
  "demo-video-123": {
    thumbnail: "/streaming-video-thumbnail.png",
    channelName: "인기 스트리머",
    createdAt: "2025년 1월 10일",
    duration: "2시간 34분",
    title: "재미있는 게임 방송 다시보기",
  },
}

const mockHighlights = [
  { id: "1", timestamp: "00:05:23", title: "게임 시작 - 첫 번째 매치 시작" },
  { id: "2", timestamp: "00:23:45", title: "대박 플레이! 5킬 달성" },
  { id: "3", timestamp: "00:45:12", title: "웃긴 장면 - 예상치 못한 상황" },
  { id: "4", timestamp: "01:12:34", title: "클러치 순간 - 1vs4 승리" },
  { id: "5", timestamp: "01:45:23", title: "최고의 순간 - 게임 우승" },
  { id: "6", timestamp: "02:15:45", title: "엔딩 멘트 및 다음 방송 예고" },
]

export default function HighlightsPage() {
  const params = useParams()
  const videoId = params.videoId as string

  const [isLoading, setIsLoading] = useState(true)
  const [videoData, setVideoData] = useState<any>(null)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const data = mockVideoData[videoId as keyof typeof mockVideoData]
      setVideoData(data || null)
      setIsLoading(false)
    }, 1500)
  }, [videoId])

  return (
    <div className="container py-12 mx-auto">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-balance">하이라이트 타임스탬프</h1>
          <p className="text-muted-foreground">
            AI가 분석한 주요 하이라이트 구간입니다. 타임스탬프를 클릭하여 해당 구간으로 이동하세요.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {isLoading ? <VideoInfoSkeleton /> : videoData ? <VideoInfoCard {...videoData} /> : null}
          </div>

          <div className="lg:col-span-3">
            {isLoading ? <HighlightListSkeleton /> : <HighlightList highlights={mockHighlights} />}
          </div>
        </div>
      </div>
    </div>
  )
}
