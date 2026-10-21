import { LoadingLink as Link } from "@/components/loading-link"
import { Card } from "@/components/ui/card"
import { Clock, ChevronRight, Film } from "lucide-react"
import type { RecentHighlight } from "@/lib/api"

function formatMinute(minute: number | null): string {
  if (minute == null) return "00:00"
  const s = Math.max(0, Math.floor(minute / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = h > 0 ? [h, m, sec] : [m, sec]
  return parts.map((p) => String(p).padStart(2, "0")).join(":")
}

export function HighlightCards({ items }: { items: RecentHighlight[] }) {
  return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => {
          const thumb = h.thumbnailImageUrl
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
  )
}
