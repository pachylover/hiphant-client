import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function LoadingState({ label = "화면을 불러오는 중입니다", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground", className)}>
      <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  )
}

export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div data-loading-overlay className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border bg-card px-6 py-3 shadow-lg">
        <LoadingState label={label} />
      </div>
    </div>
  )
}
