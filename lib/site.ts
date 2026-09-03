// 사이트 절대 URL. 메타데이터(canonical/OG)와 사이트맵이 공유한다.
// 도메인이 바뀌면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 로 덮어쓴다.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://hiphant.pachylover.com").replace(/\/+$/, "")
