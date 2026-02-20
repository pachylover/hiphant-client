import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "HiPhant - 치지직 다시보기 하이라이트 타임스탬프 추출기",
  description: "치지직 다시보기의 하이라이트 타임스탬프를 자동으로 생성합니다",
  generator: "v0.app",
  openGraph: {
    title: 'HiPhant - 치지직 다시보기 하이라이트 타임스탬프 추출기',
    description: '치지직 다시보기의 하이라이트 타임스탬프를 자동으로 생성합니다',
    url: 'https://hiphant.pachylover.com',
    siteName: 'HiPhant',
    images: [
      {
        url: '/assets/images/common/logo.v2.png', // public 폴더에 위치한 이미지
        width: 1200,
        height: 630,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HiPhant - 치지직 다시보기 하이라이트 타임스탬프 추출기',
    description: '치지직 다시보기의 하이라이트 타임스탬프를 자동으로 생성합니다',
    images: ['/assets/images/common/logo.v2.png'], // public 폴더에 위치한 이미지
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <Suspense fallback={<div>Loading...</div>}>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </Suspense>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
