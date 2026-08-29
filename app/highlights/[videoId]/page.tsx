"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { VideoInfoCard } from "@/components/video-info-card"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { HighlightList } from "@/components/highlight-list"
import type { Highlight } from "@/components/highlight-list"
import { HighlightListSkeleton } from "@/components/highlight-list-skeleton"
import { ChatSearchDialog } from "@/components/chat-search-dialog"
import { ChatVolumeChart } from "@/components/chat-volume-chart"
import { HighlightProgress } from "@/components/highlight-progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RotateCw } from "lucide-react"
import {
  fetchChatTimeline,
  requestChatReload,
  subscribeProgress,
  type ChatTimeline,
  type ProgressEvent,
} from "@/lib/api"

export default function HighlightsPage() {
  const params = useParams()
  const videoId = params.videoId as string

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true)
  // 비디오 메타 정보(정규화된 형태)
  const [videoInfo, setVideoInfo] = useState<any>(null)
  // 정규화된 하이라이트 항목 리스트
  const [highlightItems, setHighlightItems] = useState<Highlight[]>([])
  // 클라이언트에서 POST 요청을 보내는 동안의 진행 상태
  const [isCreatingHighlights, setIsCreatingHighlights] = useState(false)
  // 서버 측 생성(백그라운드) 진행 상태: 백엔드가 resultCode=202로 알릴 때 true
  const [isProcessing, setIsProcessing] = useState(false)
  // 분당 채팅량 (null = 아직 로딩 중)
  const [timeline, setTimeline] = useState<ChatTimeline | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(true)
  // SSE 로 받은 최신 진행 상황
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [isReloadingChats, setIsReloadingChats] = useState(false)

  // 열려 있는 SSE 연결을 닫기 위한 핸들
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // 한국어 형식(duration 문자열)을 초 단위 정수로 변환합니다. (예: "2시간 34분" -> 9240)
  function parseKoreanDuration(s: string | number | undefined): number | null {
    if (!s) return null
    if (typeof s === "number") return s
    const hourMatch = String(s).match(/(\d+)\s*시간/)
    const minMatch = String(s).match(/(\d+)\s*분/)
    const secMatch = String(s).match(/(\d+)\s*초/)
    let seconds = 0
    if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600
    if (minMatch) seconds += parseInt(minMatch[1], 10) * 60
    if (secMatch) seconds += parseInt(secMatch[1], 10)
    return seconds || null
  }

  // 초 단위를 'HH:MM:SS' 또는 'MM:SS' 문자열로 포맷합니다.
  function formatToHHMMSS(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const parts: string[] = []
    if (h > 0) parts.push(String(h).padStart(2, "0"))
    parts.push(String(m).padStart(2, "0"))
    parts.push(String(s).padStart(2, "0"))
    return parts.join(":")
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

  // 분당 채팅량을 불러옵니다. 채팅이 하나도 없으면 "채팅 다시 불러오기" 가 활성화됩니다.
  const loadTimeline = useCallback(async () => {
    setIsTimelineLoading(true)
    const data = await fetchChatTimeline(videoId)
    setTimeline(data)
    setIsTimelineLoading(false)
    return data
  }, [videoId])

  // 비디오 정보와 하이라이트를 불러옵니다. (백엔드의 resultCode를 우선 사용)
  const loadVideoAndHighlights = async () => {
    setIsLoading(true)
    try {
      const [videoRes, highlightsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/v1/videos/${videoId}`),
        fetch(`${API_BASE_URL}/v1/highlights/${videoId}`),
      ])

      if (!videoRes.ok) throw new Error("비디오 정보를 가져오는 중 오류가 발생했습니다")

      const videoBody = await videoRes.json()
      const videoContent = videoBody.data ?? videoBody

      // 하이라이트 응답: 서버가 resultCode(200/202/404)를 바디로 보낼 수 있음
      const highlightsBody = await highlightsRes.json()
      const apiResultCode = Number(highlightsBody?.resultCode ?? highlightsRes.status ?? 200)
      const rawHighlights = highlightsBody?.list ?? highlightsBody?.content ?? (Array.isArray(highlightsBody) ? highlightsBody : [])

      // 서버에서 생성중(202)을 알려주면 처리중 플래그를 켠다
      setIsProcessing(apiResultCode === 202)

      // 하이라이트 정규화
      // 헬퍼: HH:MM:SS 문자열을 초로 변환
      const parseHHMMSS = (timeStr: string): number | null => {
        if (!timeStr) return null
        const parts = String(timeStr).split(":").map(p => Number(p))
        if (parts.some(isNaN)) return null
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        if (parts.length === 1) return parts[0]
        return null
      }

      const normalizedHighlights = (Array.isArray(rawHighlights) ? rawHighlights : []).map((rawHighlight: any, idx: number) => {
        const fmt = (s: number) => formatToHHMMSS(Math.max(0, Math.floor(s)))
        const durationSec = typeof videoContent.duration === "number" ? videoContent.duration : parseKoreanDuration(videoContent.duration) ?? 0

        // 우선순위: minute(ms) -> numeric timestamp(seconds) -> formatted string -> fallback
        let secondsValue: number | null = null

        // 1) minute (밀리초 오프셋) 처리
        if (rawHighlight.minute !== undefined && rawHighlight.minute !== null) {
          const minuteMs = Number(rawHighlight.minute)
          if (!isNaN(minuteMs)) {
            secondsValue = Math.max(0, Math.min(durationSec, Math.floor(minuteMs / 1000)))
          }
        }

        // 2) numeric timestamp (이미 초 단위로 들어온 경우)
        if (secondsValue === null && typeof rawHighlight.timestamp === "number") {
          secondsValue = Math.max(0, Math.min(durationSec, Math.floor(rawHighlight.timestamp)))
        }

        // 3) timestamp 문자열 (HH:MM:SS 등)
        if (secondsValue === null && typeof rawHighlight.timestamp === "string") {
          const parsed = parseHHMMSS(rawHighlight.timestamp)
          if (parsed !== null) secondsValue = Math.max(0, Math.min(durationSec, parsed))
        }

        // 4) fallback: rawHighlight.time
        if (secondsValue === null && (rawHighlight.time || rawHighlight.start || rawHighlight.end)) {
          const candidate = rawHighlight.time ?? rawHighlight.start ?? rawHighlight.end
          if (typeof candidate === "number") {
            // start/end are epoch ms -> convert to offset from video publish if possible, else treat as seconds
            if (String(candidate).length >= 12) {
              const videoStartMs = Number(videoContent.publishDateAt ?? videoContent.createdAtAt ?? Date.parse(videoContent.publishDate ?? videoContent.createdAt ?? ""))
              if (!isNaN(videoStartMs)) {
                const offsetSec = Math.round((Number(candidate) - videoStartMs) / 1000)
                secondsValue = Math.max(0, Math.min(durationSec, offsetSec))
              } else {
                secondsValue = Math.max(0, Math.min(durationSec, Math.floor(Number(candidate) / 1000)))
              }
            } else {
              secondsValue = Math.max(0, Math.min(durationSec, Math.floor(Number(candidate))))
            }
          } else if (typeof candidate === "string") {
            const parsed = parseHHMMSS(candidate)
            if (parsed !== null) secondsValue = Math.max(0, Math.min(durationSec, parsed))
          }
        }

        // 최종 타임스탬프 문자열
        const displayTimestamp = secondsValue !== null ? fmt(secondsValue) : (typeof rawHighlight.timestamp === "string" ? rawHighlight.timestamp : "00:00:00")

        return {
          // DB PK가 serial(Bigserial)이면 숫자(id)가 들어옵니다 — 가능하면 숫자로 유지합니다.
          id: typeof rawHighlight.id === "number" ? rawHighlight.id : rawHighlight.taskId ?? rawHighlight.id ?? String(idx + 1),
          timestamp: displayTimestamp,
          title: rawHighlight.title ?? rawHighlight.summary ?? rawHighlight.name ?? "하이라이트",
          seconds: secondsValue ?? 0,
          videoId: videoId,
          highlightType: rawHighlight.highlightType ?? "NORMAL",
          raw: rawHighlight,
        }
      })

      // 비디오 정보 정규화
      const mappedVideoInfo = {
        thumbnailImageUrl: videoContent.thumbnail || videoContent.thumbnailUrl || videoContent.thumbnailImageUrl,
        channel: { channelName: videoContent.channelName || videoContent.channel?.channelName || "알 수 없음" },
        publishDate: videoContent.createdAt || videoContent.publishDate || "",
        duration: typeof videoContent.duration === "number" ? videoContent.duration : parseKoreanDuration(videoContent.duration) ?? 0,
        videoTitle: videoContent.title || videoContent.videoTitle || "",
        _raw: videoContent,
      }

      setVideoInfo(mappedVideoInfo)
      setHighlightItems(normalizedHighlights)
      return apiResultCode
    } catch (err) {
      console.error(err)
      // 오류 발생 시 빈 상태로 초기화(생성 버튼을 표시하기 위함)
      setVideoInfo(null)
      setHighlightItems([])
      setIsProcessing(false)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 진행 상황 스트림(SSE)을 연다. 이미 열려 있으면 먼저 닫는다.
   * 완료(DONE)되면 하이라이트/그래프를 다시 읽어 화면을 갱신한다.
   */
  const openProgressStream = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = subscribeProgress(videoId, {
      onProgress: (event) => {
        setProgress(event)
        if (event.phase === "DONE") {
          setIsProcessing(false)
          setIsReloadingChats(false)
          loadVideoAndHighlights()
          loadTimeline()
        } else if (event.phase === "ERROR") {
          setIsProcessing(false)
          setIsReloadingChats(false)
        } else {
          setIsProcessing(true)
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, loadTimeline])

  // 마운트 및 videoId 변경 시 재로딩
  useEffect(() => {
    let active = true

    setProgress(null)
    loadVideoAndHighlights().then((resultCode) => {
      // 접속 시점에 이미 서버에서 작업이 돌고 있으면 바로 진행 상황을 붙인다
      if (active && resultCode === 202) openProgressStream()
    })
    loadTimeline().then((data) => {
      if (active && data?.processing) openProgressStream()
    })

    return () => {
      active = false
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // 하이라이트 생성 요청(POST) - 201: 생성 시작, 409: 이미 생성중
  const handleCreateHighlights = async () => {
    if (isCreatingHighlights || isProcessing) return
    setIsCreatingHighlights(true)
    try {
      const body = { videoId, videoNo: videoInfo?._raw?.videoNo }
      const res = await fetch(`${API_BASE_URL}/v1/highlights/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.status === 201 || res.status === 409) {
        // 생성이 시작됐거나 이미 진행 중 — 두 경우 모두 진행 상황을 구독한다
        setIsProcessing(true)
        openProgressStream()
        return
      }

      const text = await res.text().catch(() => "")
      alert(`하이라이트 생성 실패: ${res.status} ${text}`)
    } catch (err) {
      alert((err as Error).message || "하이라이트 생성 중 오류가 발생했습니다")
    } finally {
      setIsCreatingHighlights(false)
    }
  }

  // 채팅 다시 불러오기 - 보관 기간이 지나 채팅이 사라진 영상 복구용
  const handleReloadChats = async () => {
    if (isReloadingChats || isProcessing) return
    setIsReloadingChats(true)
    setProgress(null)
    try {
      await requestChatReload(videoId)
      openProgressStream()
    } catch (err) {
      setIsReloadingChats(false)
      alert((err as Error).message || "채팅을 불러올 수 없습니다.")
    }
  }

  const hasNoChats = timeline !== null && timeline.totalChats === 0
  const isBusy = isProcessing || isReloadingChats || isCreatingHighlights

  return (
    <div className="container py-12 mx-auto">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-balance">하이라이트 타임스탬프</h1>
            <p className="text-muted-foreground">
              타임스탬프를 클릭하시면 치지직 다시보기에서 해당 구간으로 이동합니다. 하이라이트 생성이 아직 안 되어 있다면 아래 버튼을 눌러 생성해주세요.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ChatSearchDialog videoId={videoId} />
            {/* 저장된 채팅이 없을 때만 활성화된다 (채팅은 일정 기간이 지나면 사라짐) */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleReloadChats}
              disabled={!hasNoChats || isBusy}
              title={
                hasNoChats
                  ? "치지직에서 이 영상의 채팅을 다시 수집합니다"
                  : "저장된 채팅이 있어 다시 불러올 필요가 없습니다"
              }
            >
              <RotateCw className={isReloadingChats ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              채팅 다시 불러오기
            </Button>
          </div>
        </div>

        {/* 진행 상황 스트리밍 */}
        <HighlightProgress progress={progress} />

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {isLoading ? <VideoInfoSkeleton /> : videoInfo ? <VideoInfoCard {...videoInfo} /> : null}
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <HighlightListSkeleton />
            ) : highlightItems.length === 0 ? (
              <Empty>
                <EmptyContent>
                  <EmptyTitle>하이라이트가 아직 없습니다</EmptyTitle>
                  <EmptyDescription>아래 버튼을 눌러 하이라이트를 생성해주세요.</EmptyDescription>
                  <div className="pt-2">
                    <Button size="lg" onClick={handleCreateHighlights} disabled={isCreatingHighlights || isProcessing}>
                      {isCreatingHighlights || isProcessing ? "생성 중..." : "하이라이트 생성"}
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            ) : (
              <HighlightList highlights={highlightItems} />
            )}
          </div>
        </div>

        {/* 분당 채팅량 그래프 */}
        {isTimelineLoading ? (
          <Skeleton className="h-[340px] w-full rounded-xl" />
        ) : hasNoChats ? (
          <Empty>
            <EmptyContent>
              <EmptyTitle>저장된 채팅이 없습니다</EmptyTitle>
              <EmptyDescription>
                채팅은 일정 기간이 지나면 삭제됩니다. 위의 &quot;채팅 다시 불러오기&quot; 버튼으로 다시 수집하면 분당
                채팅량 그래프를 볼 수 있습니다.
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : timeline ? (
          <ChatVolumeChart videoId={videoId} timeline={timeline} />
        ) : null}
      </div>
    </div>
  )
}
