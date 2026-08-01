"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { fetchActiveBanners, type Banner } from "@/lib/api"

export function BannerCarousel({ className }: { className?: string }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let active = true
    fetchActiveBanners().then((list) => {
      if (active) setBanners(list)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  if (banners.length === 0) return null

  const current = banners[index]

  const Media = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.imageUrl}
      alt={current.title ?? "배너"}
      className="h-full w-full object-cover transition-opacity"
    />
  )

  return (
    <div className={cn("w-full", className)}>
      <div className="relative aspect-[16/5] w-full overflow-hidden rounded-2xl border border-border/50 bg-muted sm:aspect-[16/4]">
        {current.linkUrl ? (
          <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
            {Media}
          </a>
        ) : (
          Media
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                aria-label={`배너 ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
