"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { VideoInfoCard } from "@/components/video-info-card"
import { HighlightList } from "@/components/highlight-list"
import { HighlightListSkeleton } from "@/components/highlight-list-skeleton"
import { ChatSearchDialog } from "@/components/chat-search-dialog"
import { ChatVolumeChart } from "@/components/chat-volume-chart"
import { ChannelHighlights } from "@/components/channel-highlights"
import { HighlightProgress } from "@/components/highlight-progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RotateCw } from "lucide-react"
import {
  API_BASE_URL,
  fetchChatTimeline,
  requestChatReload,
  subscribeProgress,
  type ChatTimeline,
  type ProgressEvent,
} from "@/lib/api"
import {
  fetchVideoAndHighlights,
  type NormalizedHighlight,
  type NormalizedVideoInfo,
} from "@/lib/highlights"

interface HighlightsClientProps {
  videoId: string
  /** 서버에서 미리 읽어 온 값 — 초기 HTML 에 그대로 렌더링된다. */
  initialVideoInfo: NormalizedVideoInfo | null
  initialHighlights: NormalizedHighlight[]
  initialResultCode: number | null
}

export function HighlightsClient({
  videoId,
  initialVideoInfo,
  initialHighlights,
  initialResultCode,
}: HighlightsClientProps) {
  // 서버에서 받은 값으로 시작한다. 값이 비어 있으면 마운트 후 다시 읽는다.
  const [isLoading, setIsLoading] = useState(initialHighlights.length === 0)
  const [videoInfo, setVideoInfo] = useState<NormalizedVideoInfo | null>(initialVideoInfo)
  const [highlightItems, setHighlightItems] = useState<NormalizedHighlight[]>(initialHighlights)
  // 클라이언트에서 POST 요청을 보내는 동안의 진행 상태
  const [isCreatingHighlights, setIsCreatingHighlights] = useState(false)
  // 서버 측 생성(백그라운드) 진행 상태: 백엔드가 resultCode=202로 알릴 때 true
  const [isProcessing, setIsProcessing] = useState(initialResultCode === 202)
  // 분당 채팅량 (null = 아직 로딩 중)
  const [timeline, setTimeline] = useState<ChatTimeline | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(true)
  // SSE 로 받은 최신 진행 상황
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [isReloadingChats, setIsReloadingChats] = useState(false)

  // 열려 있는 SSE 연결을 닫기 위한 핸들
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // 분당 채팅량을 불러옵니다. 채팅이 하나도 없으면 "채팅 다시 불러오기" 가 활성화됩니다.
  const loadTimeline = useCallback(async () => {
    setIsTimelineLoading(true)
    const data = await fetchChatTimeline(videoId)
    setTimeline(data)
    setIsTimelineLoading(false)
    return data
  }, [videoId])

  // 비디오 정보와 하이라이트를 다시 읽습니다. (백엔드의 resultCode를 우선 사용)
  const loadVideoAndHighlights = useCallback(async () => {
    setIsLoading(true)
    try {
      const { videoInfo: info, highlights, resultCode } = await fetchVideoAndHighlights(videoId)
      setVideoInfo(info)
      setHighlightItems(highlights)
      setIsProcessing(resultCode === 202)
      return resultCode
    } finally {
      setIsLoading(false)
    }
  }, [videoId])

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
  }, [videoId, loadTimeline, loadVideoAndHighlights])

  // 마운트 및 videoId 변경 시
  useEffect(() => {
    let active = true

    setProgress(null)

    // 서버가 넘겨준 값이 불완전하면 다시 읽는다.
    //
    // 하이라이트가 빈 배열인 경우도 재조회 대상이다. 서버 렌더링은 fetch 결과를 잠시 캐시하므로
    // 생성 직후처럼 "아직 없음" 이 캐시된 순간에 들어온 방문자는 목록을 못 본 채 굳어버린다.
    // (새로고침하면 보이던 증상이 이것이다.)
    const needsRefetch = initialVideoInfo === null || initialHighlights.length === 0

    if (needsRefetch) {
      loadVideoAndHighlights().then((resultCode) => {
        if (active && resultCode === 202) openProgressStream()
      })
    } else if (initialResultCode === 202) {
      // 접속 시점에 이미 서버에서 작업이 돌고 있으면 바로 진행 상황을 붙인다
      openProgressStream()
    }

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
            <h1 className="text-3xl font-bold text-balance">
              {videoInfo?.videoTitle ? `${videoInfo.videoTitle} 하이라이트` : "하이라이트 타임스탬프"}
            </h1>
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
            {videoInfo ? <VideoInfoCard {...videoInfo} /> : null}
          </div>

          <div className="lg:col-span-3">
            {isLoading && highlightItems.length === 0 ? (
              <HighlightListSkeleton />
            ) : highlightItems.length === 0 ? (
              <Empty>
                <EmptyContent>
                  <EmptyTitle>하이라이트가 아직 없습니다</EmptyTitle>
                  <EmptyDescription>아래 버튼을 눌러 하이라이트를 생성해주세요.</EmptyDescription>
                  <div className="pt-2">
                    <Button size="lg" onClick={handleCreateHighlights} disabled={isCreatingHighlights || isProcessing || isLoading}>
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

        {/* 같은 스트리머의 다른 하이라이트 페이지 — 없으면 렌더링되지 않는다 */}
        {videoInfo && (
          <ChannelHighlights
            channelId={videoInfo.channelId}
            channelName={videoInfo.channel?.channelName}
            currentVideoId={videoId}
          />
        )}
      </div>
    </div>
  )
}
