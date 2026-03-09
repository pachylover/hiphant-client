import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export const metadata: Metadata = {
  title: "치지직 하이라이트 분석기 | HiPhant",
  description: "치지직 다시보기 URL을 입력해 하이라이트 타임스탬프를 확인하세요.",
}

async function submitVideoUrl(formData: FormData) {
  "use server"

  const url = String(formData.get("url") || "").trim()

  if (!url) {
    redirect("/")
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.hostname !== "chzzk.naver.com" || !parsedUrl.pathname.startsWith("/video/")) {
      redirect("/")
    }

    const videoId = parsedUrl.pathname.split("/").pop()
    if (!videoId) {
      redirect("/")
    }

    redirect(`/video/${videoId}`)
  } catch {
    redirect("/")
  }
}

export default function HomePage() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 mx-auto">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
            <span className="text-accent">HiPhant</span><br/>
            치지직 하이라이트 분석기
          </h1>

          <p className="text-lg text-muted-foreground text-pretty">
            치지직 다시보기 URL을 입력하여 하이라이트를 찾아보세요
          </p>
        </div>

        <form action={submitVideoUrl} className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              name="url"
              placeholder="치지직 다시보기 URL을 입력하세요"
              className="h-14 pr-14 text-base"
              required
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1 h-12 w-12 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
          >
            하이라이트 찾기
          </Button>
        </form>
      </div>
    </div>
  )
}
