import { Suspense } from "react"
import { LoadingState } from "@/components/loading-state"
import { BannerCarousel } from "@/components/banner-carousel"
import { RecentHighlights } from "@/components/recent-highlights"
import { VideoUrlForm } from "@/components/video-url-form"
import { StreamerSearch } from "@/components/streamer-search"
import { createPageMetadata } from "@/lib/metadata"

export const metadata = createPageMetadata({
  title: "HiPhant - 치지직 다시보기 하이라이트 분석기",
  description: "치지직 다시보기 URL로 채팅이 몰린 하이라이트를 분석하고, 스트리머 이름으로 이미 생성된 방송 하이라이트를 찾아보세요.",
  path: "/",
})

// 홈 요청마다 최신 하이라이트 목록을 조회해 서버에서 렌더링한다.
export const revalidate = 0

export default function HomePage() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-16 py-12">
      <div className="flex min-h-[55vh] w-full max-w-3xl flex-col justify-center gap-8">
        <BannerCarousel />

        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            <span className="text-accent">HiPhant</span><br/>
            치지직 하이라이트 분석기
          </h1>

          <p className="text-lg text-muted-foreground text-pretty">
            치지직 다시보기 URL을 입력하여 하이라이트를 찾아보세요
          </p>
        </div>

        <VideoUrlForm />

        <section id="streamers" aria-label="스트리머 찾기" className="scroll-mt-24 border-t border-border/50 pt-8">
          <StreamerSearch />
        </section>
      </div>

      <div className="w-full max-w-5xl">
        <Suspense fallback={<LoadingState label="최근 하이라이트를 불러오는 중입니다" />}><RecentHighlights /></Suspense>
      </div>
    </div>
  )
}
