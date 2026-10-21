import { LoadingState } from "@/components/loading-state"
import { Skeleton } from "@/components/ui/skeleton"

export function PageLoading({ label = "화면을 불러오는 중입니다" }: { label?: string }) {
  return <div data-page-loading aria-busy="true" className="container mx-auto max-w-5xl space-y-6 px-4 py-12">
    <LoadingState label={label} />
    <div aria-hidden="true" className="space-y-6">
      <Skeleton className="h-8 w-2/3 max-w-sm" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-3">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>)}
      </div>
    </div>
  </div>
}
