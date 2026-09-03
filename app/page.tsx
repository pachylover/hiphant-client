import { BannerCarousel } from "@/components/banner-carousel"
import { RecentHighlights } from "@/components/recent-highlights"
import { VideoUrlForm } from "@/components/video-url-form"

// 최근 하이라이트를 서버에서 렌더링한다(검색엔진이 목록과 링크를 그대로 읽는다).
// 5분마다 갱신 — 그 사이 요청은 캐시된 HTML 로 응답한다.
export const revalidate = 300

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
      </div>

      <div className="w-full max-w-5xl">
        <RecentHighlights />
      </div>
    </div>
  )
}
