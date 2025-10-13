import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function HighlightListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="border-border/50 p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />

            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
