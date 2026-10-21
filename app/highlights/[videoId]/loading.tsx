import { LoadingState } from "@/components/loading-state"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"
import { HighlightListSkeleton } from "@/components/highlight-list-skeleton"

export default function Loading() {
  return <div aria-busy="true" className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
    <LoadingState label="방송 정보와 하이라이트를 불러오는 중입니다" />
    <div aria-hidden="true" className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2"><VideoInfoSkeleton /></div>
      <div className="lg:col-span-3"><HighlightListSkeleton /></div>
    </div>
  </div>
}
