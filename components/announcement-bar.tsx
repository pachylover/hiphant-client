"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { X, Info, TriangleAlert, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchActiveAnnouncements, type Announcement } from "@/lib/api"

const DISMISS_KEY = "hiphant_dismissed_announcements"

const LEVEL_STYLE: Record<string, string> = {
  INFO: "bg-accent/10 text-foreground border-accent/30",
  WARNING: "bg-destructive/10 text-foreground border-destructive/30",
  SUCCESS: "bg-primary/10 text-foreground border-primary/30",
}

const LEVEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  INFO: Info,
  WARNING: TriangleAlert,
  SUCCESS: CheckCircle2,
}

function getDismissed(): number[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(DISMISS_KEY) || "[]")
  } catch {
    return []
  }
}

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    let active = true
    fetchActiveAnnouncements().then((list) => {
      if (!active) return
      const dismissed = getDismissed()
      // 가장 최근(첫번째) 중 아직 닫지 않은 것 하나를 노출
      const next = list.find((a) => !dismissed.includes(a.id))
      setAnnouncement(next ?? null)
    })
    return () => {
      active = false
    }
  }, [])

  if (!announcement) return null

  const dismiss = () => {
    const dismissed = getDismissed()
    if (!dismissed.includes(announcement.id)) {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed, announcement.id]))
    }
    setAnnouncement(null)
  }

  const Icon = LEVEL_ICON[announcement.level] ?? Info
  const style = LEVEL_STYLE[announcement.level] ?? LEVEL_STYLE.INFO

  const content = (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm">{announcement.message}</span>
    </div>
  )

  return (
    <div className={cn("border-b", style)}>
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2">
        {announcement.linkUrl ? (
          <a
            href={announcement.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate hover:underline"
          >
            {content}
          </a>
        ) : (
          <div className="min-w-0 flex-1 truncate">{content}</div>
        )}
        <button
          aria-label="안내문구 닫기"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
