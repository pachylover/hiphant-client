import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site"

export function createPageMetadata({ title, description, path, noindex = false }: {
  title: string
  description: string
  path: string
  noindex?: boolean
}): Metadata {
  const url = `${SITE_URL}${path}`
  const images = [{ url: "/assets/images/common/logo.v2.png", width: 1200, height: 630 }]
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: !noindex, follow: true },
    openGraph: { title, description, url, siteName: "HiPhant", type: "website", locale: "ko_KR", images },
    twitter: { card: "summary_large_image", title, description, images },
  }
}
