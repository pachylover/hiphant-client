import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Clock, Sparkles, ChevronRight, Film } from "lucide-react"
import { fetchRecentHighlights, fetchVideoThumbnail } from "@/lib/api"

/** 목록과 섬네일을 서버에서 5분 단위로 캐시한다 — 크롤러가 받는 HTML에 그대로 들어간다. */
const REVALIDATE_SECONDS = 300

function formatMinute(minute: number | null): string {
  if (minute == null) return "00:00"
  const s = Math.max(0, Math.floor(minute / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = h > 0 ? [h, m, sec] : [m, sec]
  return parts.map((p) => String(p).padStart(2, "0")).join(":")
}

/**
 * 최근 생성된 하이라이트. 서버 컴포넌트라 카드와 링크가 초기 HTML 에 포함되고,
 * 검색엔진이 각 하이라이트 페이지를 그대로 따라갈 수 있다.
 */
export async function RecentHighlights() {
  const items = await fetchRecentHighlights(6, REVALIDATE_SECONDS)

  // 데이터가 없으면 섹션 자체를 감춘다
  if (items.length === 0) return null

  const thumbs = Object.fromEntries(
    await Promise.all(
      items.map(async (h) => [h.videoId, await fetchVideoThumbnail(h.videoId, REVALIDATE_SECONDS)] as const),
    ),
  ) as Record<string, string | null>

  return (
    <section className="w-full">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">최근 생성된 하이라이트</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => {
          const thumb = thumbs[h.videoId]
          const title = h.videoTitle ?? "하이라이트"
          return (
            <Link key={h.id} href={`/highlights/${encodeURIComponent(h.videoId)}`} className="group">
              <Card className="h-full overflow-hidden border-border/50 p-0 transition-all hover:border-accent hover:shadow-md">
                {/* 섬네일 */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={h.channelName ? `${h.channelName} - ${title}` : title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-muted">
                      <Film className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* 하단 타임스탬프 */}
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white">
                    <Clock className="h-3 w-3" />
                    {formatMinute(h.minute)}
                  </span>
                </div>

                {/* 본문 — 영상 제목과 스트리머만 노출한다 */}
                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug text-pretty group-hover:text-accent">
                      {title}
                    </h3>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  {h.channelName && <p className="truncate text-xs text-muted-foreground">{h.channelName}</p>}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
