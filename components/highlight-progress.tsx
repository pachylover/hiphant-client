"use client"

import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProgressEvent, ProgressPhase } from "@/lib/api"

const PHASE_LABEL: Record<ProgressPhase, string> = {
  START: "준비 중",
  FETCH_CHATS: "채팅 수집",
  SAVE_CHATS: "채팅 저장",
  ANALYZE: "구간 분석",
  DONE: "완료",
  ERROR: "실패",
}

/**
 * 서버가 SSE 로 흘려보내는 현재 작업 단계를 보여준다.
 * 단계/문구/진행률을 함께 노출해, 색이나 애니메이션에만 의존하지 않는다.
 */
export function HighlightProgress({ progress }: { progress: ProgressEvent | null }) {
  if (!progress) return null

  const isError = progress.phase === "ERROR"
  const isDone = progress.phase === "DONE"
  const percent = Math.max(0, Math.min(100, progress.percent))

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "space-y-3 rounded-xl border p-4",
        isError ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card",
      )}
    >
      <div className="flex items-start gap-2.5">
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : isDone ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        ) : (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">
            {PHASE_LABEL[progress.phase]}
            {!isError && !isDone && <span className="ml-2 tabular-nums text-muted-foreground">{percent}%</span>}
          </p>
          <p className={cn("text-sm text-pretty", isError ? "text-destructive" : "text-muted-foreground")}>
            {progress.message}
          </p>
          {progress.chatCount != null && progress.chatCount > 0 && (
            <p className="text-xs tabular-nums text-muted-foreground">
              수집된 채팅 {progress.chatCount.toLocaleString()}개
              {progress.highlightCount != null && ` · 생성된 하이라이트 ${progress.highlightCount}개`}
            </p>
          )}
        </div>
      </div>

      {!isError && <Progress value={percent} className="h-1.5" />}
    </div>
  )
}
