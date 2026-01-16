"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { VideoInfoCard } from "@/components/video-info-card"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { HighlightList } from "@/components/highlight-list"
import { HighlightListSkeleton } from "@/components/highlight-list-skeleton"

// Mock data (fallback)
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
  const [highlights, setHighlights] = useState<any[]>([])

  // Helper: parse Korean duration like "2시간 34분" -> seconds
  function parseKoreanDurationString(s: string | number | undefined): number | null {
    if (!s) return null
    if (typeof s === "number") return s
    const hourMatch = s.match(/(\d+)\s*시간/)
    const minMatch = s.match(/(\d+)\s*분/)
    const secMatch = s.match(/(\d+)\s*초/)
    let seconds = 0
    if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600
    if (minMatch) seconds += parseInt(minMatch[1], 10) * 60
    if (secMatch) seconds += parseInt(secMatch[1], 10)
    return seconds || null
  }

  // Helper: format seconds to HH:MM:SS or MM:SS
  function formatSecondsToHHMMSS(sec: number): string {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const parts = []
    if (h > 0) parts.push(String(h).padStart(2, "0"))
    parts.push(String(m).padStart(2, "0"))
    parts.push(String(s).padStart(2, "0"))
    return parts.join(":")
  }

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

    const fetchData = async () => {
      try {
        const [videoRes, highlightsRes] = await Promise.all([
          fetch(`${API_URL}/v1/videos/${videoId}`),
          fetch(`${API_URL}/v1/highlights/${videoId}`, { method: 'POST' }),
        ])

        if (!videoRes.ok) throw new Error("비디오 정보를 가져오는 중 오류가 발생했습니다")
        if (!highlightsRes.ok) throw new Error("하이라이트를 가져오는 중 오류가 발생했습니다")

        const videoJson = await videoRes.json()
        const highlightsJson = await highlightsRes.json()

        const videoContent = videoJson.content ?? videoJson
        const highlightsContent = Array.isArray(highlightsJson.content) ? highlightsJson.content : highlightsJson

        // Normalize video data to match VideoInfoCard props
        const mappedVideo = {
          thumbnailImageUrl:
            videoContent.thumbnail || videoContent.thumbnailUrl || videoContent.thumbnailImageUrl || "/streaming-video-thumbnail.png",
          channel: { channelName: videoContent.channelName || videoContent.channel?.name || "알 수 없음" },
          publishDate: videoContent.createdAt || videoContent.publishDate || "",
          duration:
            typeof videoContent.duration === "number"
              ? videoContent.duration
              : parseKoreanDurationString(videoContent.duration) ?? 0,
          videoTitle: videoContent.title || videoContent.videoTitle || "",
        }

        const mappedHighlights = (Array.isArray(highlightsContent) ? highlightsContent : []).map((h: any, idx: number) => ({
          id: h.id ?? String(idx + 1),
          timestamp: typeof h.timestamp === "number" ? formatSecondsToHHMMSS(h.timestamp) : h.timestamp ?? h.time ?? "00:00:00",
          title: h.title ?? h.name ?? "하이라이트",
        }))

        setVideoData(mappedVideo)
        setHighlights(mappedHighlights)
      } catch (error) {
        console.error(error)
        // Fallback to mock data
        const data = mockVideoData[videoId as keyof typeof mockVideoData]
        setVideoData(data || null)
        setHighlights(mockHighlights)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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
