import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface Highlight {
  id: number | string
  timestamp: string
  title: string
  seconds?: number
  videoId?: string
}

interface HighlightListProps {
  highlights: Highlight[]
}

export function HighlightList({ highlights }: HighlightListProps) {
  return (
    <div className="space-y-3">
      {highlights.map((highlight, index) => {
        const seconds = highlight.seconds ?? 0
        const targetVideoId = highlight.videoId ?? ""
        const href = `https://chzzk.naver.com/video/${encodeURIComponent(targetVideoId)}?currentTime=${encodeURIComponent(String(seconds))}`

        return (
          <Card
            key={String(highlight.id)}
            className="group border-border/50 p-0 transition-all hover:border-accent hover:bg-card/80"
          >
            <a href={href} target="_blank" rel="noopener noreferrer" className="block p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-semibold text-accent">
                  {index + 1}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono">{highlight.timestamp}</span>
                  </div>

                  <h3 className="font-medium leading-tight text-pretty group-hover:text-accent transition-colors">
                    {highlight.title}
                  </h3>
                </div>
              </div>
            </a>
          </Card>
        )
      })}
    </div>
  )
}
