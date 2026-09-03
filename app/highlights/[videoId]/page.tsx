import type { Metadata } from "next"

import { HighlightsClient } from "./highlights-client"
import { fetchVideoAndHighlights } from "@/lib/highlights"
import { SITE_URL } from "@/lib/site"

// 하이라이트 목록을 서버에서 렌더링한다 — 검색엔진이 제목/스트리머/타임스탬프를 그대로 읽는다.
export const revalidate = 300

interface PageProps {
  params: Promise<{ videoId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { videoId } = await params
  const { videoInfo, highlights } = await fetchVideoAndHighlights(videoId, { revalidate })

  const url = `${SITE_URL}/highlights/${encodeURIComponent(videoId)}`

  // 영상 정보를 못 읽었으면(삭제/비공개) 일반 제목으로 둔다
  if (!videoInfo?.videoTitle) {
    return {
      title: "하이라이트 타임스탬프 | HiPhant",
      description: "치지직 다시보기의 채팅이 몰린 구간을 타임스탬프로 정리합니다.",
      alternates: { canonical: url },
    }
  }

  const channelName = videoInfo.channel?.channelName
  const title = channelName
    ? `${channelName} - ${videoInfo.videoTitle} 하이라이트 타임스탬프`
    : `${videoInfo.videoTitle} 하이라이트 타임스탬프`
  const description =
    highlights.length > 0
      ? `${channelName ?? "치지직"} 다시보기 "${videoInfo.videoTitle}"에서 채팅이 몰린 구간 ${highlights.length}개를 타임스탬프로 정리했습니다.`
      : `${channelName ?? "치지직"} 다시보기 "${videoInfo.videoTitle}"의 하이라이트 타임스탬프를 확인하세요.`

  return {
    title: `${title} | HiPhant`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "HiPhant",
      type: "video.other",
      locale: "ko_KR",
      images: videoInfo.thumbnailImageUrl ? [{ url: videoInfo.thumbnailImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: videoInfo.thumbnailImageUrl ? [videoInfo.thumbnailImageUrl] : undefined,
    },
  }
}

export default async function HighlightsPage({ params }: PageProps) {
  const { videoId } = await params
  const { videoInfo, highlights, resultCode } = await fetchVideoAndHighlights(videoId, { revalidate })

  return (
    <HighlightsClient
      videoId={videoId}
      initialVideoInfo={videoInfo}
      initialHighlights={highlights}
      initialResultCode={resultCode}
    />
  )
}
