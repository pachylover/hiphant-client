import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"

export interface Highlight {
  id: number | string
  timestamp: string
  title: string
  seconds?: number
  videoId?: string
  /**
   * NORMAL | LAUGH | QUESTION etc. coming from backend
   */
  highlightType?: string
}

interface HighlightListProps {
  highlights: Highlight[]
}

export function HighlightList({ highlights }: HighlightListProps) {
  // Pre-calc lists per type for tabs
  const normalHighlights = highlights.filter(h => !h.highlightType || h.highlightType === "NORMAL")
  const laughHighlights = highlights.filter(h => h.highlightType === "LAUGH")
  const questionHighlights = highlights.filter(h => h.highlightType === "QUESTION")

  const renderList = (items: Highlight[]) => (
    <div className="space-y-3">
      {items.map((highlight, index) => {
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

  return (
    <Tabs defaultValue="NORMAL" className="space-y-4">
      <TabsList className="h-auto w-full rounded-xl border border-border/50 bg-muted/60 p-1">
        <TabsTrigger
          value="NORMAL"
          className="h-9 flex-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
        >
          기본
        </TabsTrigger>
        <TabsTrigger
          value="LAUGH"
          className="h-9 flex-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
        >
          ㅋㅋㅋ
        </TabsTrigger>
        <TabsTrigger
          value="QUESTION"
          className="h-9 flex-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
        >
          ?
        </TabsTrigger>
      </TabsList>

      <TabsContent value="NORMAL">
        {renderList(normalHighlights)}
      </TabsContent>

      <TabsContent value="LAUGH">
        {renderList(laughHighlights)}
      </TabsContent>

      <TabsContent value="QUESTION">
        {renderList(questionHighlights)}
      </TabsContent>
    </Tabs>
  )
}
