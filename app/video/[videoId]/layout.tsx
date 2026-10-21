import type { ReactNode } from "react"
import { createPageMetadata } from "@/lib/metadata"

export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params
  return createPageMetadata({
    title: "치지직 다시보기 분석 | HiPhant",
    description: "치지직 다시보기의 채팅 분포를 확인하고 하이라이트 타임스탬프를 생성하세요.",
    path: `/video/${encodeURIComponent(videoId)}`,
    noindex: true,
  })
}

export default function VideoLayout({ children }: { children: ReactNode }) {
  return children
}
