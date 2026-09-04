import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

export const revalidate = 3600

/**
 * 정적 페이지만 싣는다.
 *
 * 하이라이트 페이지(/highlights/[videoId])는 제목·설명에 스트리머 이름과 방송 제목이
 * 들어가므로 검색 노출 대상에서 제외한다. 사이트맵에서 빼는 것만으로는 색인을 막지 못해
 * 해당 페이지들에는 noindex 를 함께 걸어 두었다 (app/highlights/[videoId]/page.tsx).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/guide`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/notice`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.5 },
  ]
}
