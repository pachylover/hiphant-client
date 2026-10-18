import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Download } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { KeywordHighlightDialog } from "@/components/keyword-highlight-dialog"
import { ClipDownloadDialog } from "@/components/clip-download-dialog"

export interface Highlight {
  id: number | string
  timestamp: string
  title: string
  seconds?: number
  videoId?: string
  clipStartSeconds: number
  clipEndSeconds: number
  /**
   * NORMAL | LAUGH | QUESTION etc. coming from backend
   */
  highlightType?: string
}

interface HighlightListProps {
  videoId?: string
  onHighlightsAdded?: (highlights: unknown[]) => void
  highlights: Highlight[]
  videoDuration?: number
  videoTitle?: string
  channelName?: string
}

export function HighlightList({ highlights, videoId, onHighlightsAdded, videoDuration, videoTitle = "영상", channelName = "채널" }: HighlightListProps) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState(highlights.some(h => h.highlightType === "KEYWORD") && !highlights.some(h => !h.highlightType || h.highlightType === "NORMAL") ? "KEYWORD" : "NORMAL")
  const [downloadHighlight, setDownloadHighlight] = useState<Highlight | null>(null)

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
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 rounded-md">
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                disabled={downloadHighlight !== null || !highlight.videoId || !Number.isFinite(highlight.clipStartSeconds)
                  || !Number.isFinite(highlight.clipEndSeconds) || highlight.clipStartSeconds < 0
                  || highlight.clipEndSeconds <= highlight.clipStartSeconds}
                onClick={() => setDownloadHighlight(highlight)}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                구간 다운로드
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )

  return (
    <>
    {videoId && onHighlightsAdded && <div className="mb-3">
      <KeywordHighlightDialog videoId={videoId} onHighlightsAdded={items => { onHighlightsAdded(items); setTab("KEYWORD") }} />
    </div>}
    <p className="mb-3 text-xs text-muted-foreground">구간 다운로드는 창에서 구간을 조절한 뒤 다운로드 시작을 눌러 진행합니다. 브라우저 메모리를 사용하고, 모바일에서는 큰 파일 저장이 실패할 수 있습니다. 취소 후 화질을 바꿔 재시도할 수 있습니다.</p>
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="h-auto w-full rounded-xl border border-border/50 bg-muted/60 p-1">
        {[
          ["NORMAL", "기본"], ["LAUGH", "ㅋㅋㅋ"], ["QUESTION", "갈고리 수집"], ["KEYWORD", "특정 채팅"],
        ].map(([value, label]) => (
          <TabsTrigger key={value} value={value}
            className="h-9 min-w-0 flex-1 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground dark:data-[state=active]:bg-accent dark:data-[state=active]:text-accent-foreground data-[state=active]:shadow-none sm:text-sm">
            {label}
          </TabsTrigger>
        ))}
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
      <TabsContent value="KEYWORD">
        {highlights.some(h => h.highlightType === "KEYWORD") ? renderList(highlights.filter(h => h.highlightType === "KEYWORD"))
          : <p className="py-6 text-center text-sm text-muted-foreground">특정 채팅으로 추가 버튼을 눌러 키워드가 몰린 구간을 자동으로 탐지하세요.</p>}
      </TabsContent>
    </Tabs>
    {downloadHighlight?.videoId && (
      <ClipDownloadDialog
        key={`${downloadHighlight.videoId}-${downloadHighlight.id}`}
        videoId={downloadHighlight.videoId}
        startSeconds={downloadHighlight.clipStartSeconds}
        endSeconds={downloadHighlight.clipEndSeconds}
        videoDuration={videoDuration}
        title={videoTitle}
        channelName={channelName}
        mobile={isMobile}
        onClose={() => setDownloadHighlight(null)}
      />
    )}
    </>
  )
}
