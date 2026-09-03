"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ChevronRight, Film, Users } from "lucide-react"
import { fetchChannelHighlights, fetchVideoThumbnail, type RecentHighlight } from "@/lib/api"

interface ChannelHighlightsProps {
  /** 치지직 채널 ID. 없으면 섹션을 렌더링하지 않는다. */
  channelId: string | null | undefined
  channelName?: string | null
  /** 현재 보고 있는 영상 — 목록에서 제외한다. */
  currentVideoId: string
}

/**
 * 같은 스트리머의 다른 하이라이트 페이지 목록.
 * 하이라이트 화면 하단에 노출되며, 만들어진 페이지가 없으면 아무것도 그리지 않는다.
 */
export function ChannelHighlights({ channelId, channelName, currentVideoId }: ChannelHighlightsProps) {
  const [items, setItems] = useState<RecentHighlight[] | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (!channelId) {
      setItems([])
      return
    }

    let active = true
    fetchChannelHighlights(channelId, currentVideoId, 6).then((list) => {
      if (!active) return
      setItems(list)
      // 각 영상 섬네일을 병렬로 로드 (백엔드 캐시됨)
      Promise.all(
        list.map((h) => fetchVideoThumbnail(h.videoId).then((t) => [h.videoId, t] as const)),
      ).then((pairs) => {
        if (active) setThumbs(Object.fromEntries(pairs))
      })
    })
    return () => {
      active = false
    }
  }, [channelId, currentVideoId])

  // 로딩 전이거나 다른 하이라이트가 없으면 섹션 자체를 감춘다
  if (!items || items.length === 0) return null

  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">
          {channelName ? `${channelName}의 다른 하이라이트` : "이 스트리머의 다른 하이라이트"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => {
          const thumb = thumbs[h.videoId]
          return (
            <Link key={h.id} href={`/highlights/${encodeURIComponent(h.videoId)}`} className="group">
              <Card className="h-full overflow-hidden border-border/50 p-0 transition-all hover:border-accent hover:shadow-md">
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={h.videoTitle ?? "하이라이트 섬네일"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-muted">
                      <Film className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2 p-3">
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-pretty group-hover:text-accent">
                    {h.videoTitle ?? "하이라이트"}
                  </h3>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
