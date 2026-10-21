import { LoadingState } from "@/components/loading-state"
import { VideoInfoSkeleton } from "@/components/video-info-skeleton"

export default function Loading() {
  return <div aria-busy="true" className="container mx-auto max-w-2xl space-y-6 px-4 py-12">
    <LoadingState label="방송 정보를 불러오는 중입니다" />
    <div aria-hidden="true"><VideoInfoSkeleton /></div>
  </div>
}
