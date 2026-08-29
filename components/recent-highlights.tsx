"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Sparkles, ChevronRight, Film } from "lucide-react"
import { fetchRecentHighlights, fetchVideoThumbnail, type RecentHighlight } from "@/lib/api"

const TYPE_LABEL: Record<string, string> = {
  NORMAL: "기본",
  LAUGH: "ㅋㅋㅋ",
  QUESTION: "갈고리",
}

function formatMinute(minute: number | null): string {
  if (minute == null) return "00:00"
  const s = Math.max(0, Math.floor(minute / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = h > 0 ? [h, m, sec] : [m, sec]
  return parts.map((p) => String(p).padStart(2, "0")).join(":")
}

export function RecentHighlights() {
  const [items, setItems] = useState<RecentHighlight[] | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({})

  useEffect(() => {
    let active = true
    fetchRecentHighlights(6).then((list) => {
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
  }, [])

  // 로딩 전이거나 데이터가 없으면 섹션 자체를 감춘다
  if (!items || items.length === 0) return null

  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">최근 생성된 하이라이트</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => {
          const thumb = thumbs[h.videoId]
          return (
            <Link key={h.id} href={`/highlights/${encodeURIComponent(h.videoId)}`} className="group">
              <Card className="h-full overflow-hidden border-border/50 p-0 transition-all hover:border-accent hover:shadow-md">
                {/* 섬네일 */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={h.videoTitle ?? h.title ?? "하이라이트 섬네일"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-muted">
                      <Film className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* 상단 유형 배지 */}
                  <Badge variant="secondary" className="absolute left-2 top-2 shadow-sm">
                    {TYPE_LABEL[h.highlightType ?? "NORMAL"] ?? h.highlightType}
                  </Badge>

                  {/* 하단 타임스탬프 */}
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white">
                    <Clock className="h-3 w-3" />
                    {formatMinute(h.minute)}
                  </span>
                </div>

                {/* 본문 */}
                <div className="flex flex-col gap-2 p-3">
                  {/* 영상 제목을 우선 노출하고, 아직 백필되지 않은 항목만 하이라이트 문구로 대체한다 */}
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-pretty group-hover:text-accent">
                    {h.videoTitle ?? h.title ?? "하이라이트"}
                  </h3>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{h.videoTitle ? (h.title ?? h.videoId) : h.videoId}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
