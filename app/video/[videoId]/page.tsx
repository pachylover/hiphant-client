"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { VideoInfoCard } from "@/components/video-info-card"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { Sparkles, Search } from "lucide-react"

export default function VideoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const videoId = params.videoId as string
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

  const [isLoading, setIsLoading] = useState(true)
  const [videoData, setVideoData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    // allow pre-seeding the page with a video object via query string:
    // ?payload=<json | urlencoded-json | base64(json)>
    const payloadParam = searchParams?.get("payload") || searchParams?.get("video") || searchParams?.get("videoData")

    const tryParse = (p: string | null) => {
      if (!p) return null
      // try direct JSON / url-decoded JSON / base64
      try {
        return JSON.parse(p)
      } catch (_) {}
      try {
        return JSON.parse(decodeURIComponent(p))
      } catch (_) {}
      try {
        // atob for base64
        return JSON.parse(atob(p))
      } catch (err) {
        console.warn("failed to parse payload param", err)
        return null
      }
    }

    if (payloadParam) {
      const parsed = tryParse(payloadParam)
      if (parsed) {
        setVideoData(parsed)
        setIsLoading(false)
        return
      }
      console.warn("payload found but could not be parsed — falling back to API fetch")
    }

    fetchVideoData()
  }, [videoId, searchParams])

  //비디오 정보 가져오기
  const fetchVideoData = async () => {
    // API 요청 보내기
    try {
      const response = await fetch(`${API_URL}/v1/videos/${videoId}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("네트워크 응답이 올바르지 않습니다")
      }

      const data = await response.json()

      // 오류가 있는 경우 처리
      if (data.error || data.resultCode !== 200) {
        throw new Error(data.error || "비디오 정보를 가져오는 중 오류가 발생했습니다")
      } else {
        setVideoData(data.data)
      }
      setIsLoading(false)
      return data
    } catch (error) {
      alert((error as Error).message || "알 수 없는 오류가 발생했습니다")
      setIsLoading(false)
      return
    }
  }

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
            className="bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
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
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
            onClick={handleGenerateHighlights}
            disabled={isGenerating}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {isGenerating ? "이동중입니다..." : "하이라이트 생성화면으로 이동"}
          </Button>

          <Button className="cursor-pointer" size="lg" variant="outline" onClick={() => router.push("/")}>
            <Search className="mr-2 h-5 w-5" />
            다시 찾기
          </Button>
        </div>
      </div>
    </div>
  )
}
