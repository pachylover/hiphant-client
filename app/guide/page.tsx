import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const steps = [
  {
    step: 1,
    title: "치지직 다시보기 URL 복사",
    description: "분석하고 싶은 치지직 다시보기 영상의 URL을 복사합니다. URL은 'https://chzzk.naver.com/video/...' 형식이어야 합니다.",
    image: "/assets/images/guide/step-1.png",
  },
  {
    step: 2,
    title: "URL 입력",
    description: "HiPhant 메인 페이지의 입력창에 복사한 URL을 붙여넣기 합니다.",
    image: "/assets/images/guide/step-2.png",
  },
  {
    step: 3,
    title: "하이라이트 찾기 버튼 클릭",
    description: "'하이라이트 찾기' 버튼을 클릭하여 분석을 시작합니다. 채팅이 많은 영상의 경우 분석에 시간이 소요될 수 있습니다.",
    image: "/assets/images/guide/step-3.png",
  },
  {
    step: 4,
    title: "하이라이트 구간 확인",
    description: "분석이 완료되면 하이라이트 구간 목록이 표시됩니다. 각 구간을 클릭하면 해당 시간으로 이동할 수 있습니다.",
    image: "/assets/images/guide/step-4.png",
  },
]

export default function GuidePage() {
  return (
    <div className="container py-8 mx-auto">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-0">
              <ArrowLeft className="h-4 w-4" />
              돌아가기
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">사용 방법</h1>
          <p className="text-muted-foreground">
            HiPhant를 사용하여 치지직 다시보기의 하이라이트를 찾는 방법을 알아보세요.
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Image placeholder - 추후 이미지 추가 */}
              <div className="relative w-full aspect-video bg-secondary flex items-center justify-center">
                <Image
                  src={item.image}
                  alt={`Step ${item.step}: ${item.title}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // 이미지가 없으면 placeholder 표시
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                  <span className="text-muted-foreground text-sm">이미지 준비 중</span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                    {item.step}
                  </span>
                  <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed pl-11">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">참고 사항</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-accent">-</span>
              채팅이 많은 영상의 경우 분석에 시간이 더 소요될 수 있습니다. (약 15만 건 기준 3분 이상)
            </li>
            <li className="flex gap-2">
              <span className="text-accent">-</span>
              하이라이트는 채팅 빈도를 기반으로 분석되므로, 채팅이 적은 영상은 정확도가 낮을 수 있습니다.
            </li>
            <li className="flex gap-2">
              <span className="text-accent">-</span>
              문의사항이 있으시면 카카오톡 또는 이메일로 연락해 주세요.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
