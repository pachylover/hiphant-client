import { Card } from "@/components/ui/card"
import { Clock, Calendar, User } from "lucide-react"
import Image from "next/image"

interface VideoInfoCardProps {
  thumbnail: string
  channelName: string
  createdAt: string
  duration: string
  title?: string
}

export function VideoInfoCard({ thumbnail, channelName, createdAt, duration, title }: VideoInfoCardProps) {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <Image src={thumbnail || "/placeholder.svg"} alt="비디오 썸네일" fill className="object-cover" />
      </div>

      <div className="space-y-4 p-6">
        {title && <h2 className="text-xl font-semibold leading-tight text-balance">{title}</h2>}

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{channelName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{createdAt}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{duration}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
