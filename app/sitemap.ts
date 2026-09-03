import type { MetadataRoute } from "next"

import { fetchHighlightIndex } from "@/lib/api"
import { SITE_URL } from "@/lib/site"

// 하이라이트가 계속 생기므로 정적 파일 대신 매시간 갱신되는 사이트맵을 만든다.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/guide`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/notice`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.5 },
  ]

  // 하이라이트가 생성된 영상 페이지. API 가 죽어 있으면 빈 배열이라 정적 페이지만 남는다.
  const highlights = await fetchHighlightIndex(500, revalidate)

  return [
    ...staticPages,
    ...highlights.map((h) => ({
      url: `${SITE_URL}/highlights/${encodeURIComponent(h.videoId)}`,
      lastModified: h.createdAt ? new Date(h.createdAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]
}
