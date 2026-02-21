"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NoticeFrontmatter {
  startDate: string
  endDate: string
  title: string
}

interface NoticeData {
  frontmatter: NoticeFrontmatter
  html: string
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: raw }

  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    frontmatter[key] = value
  }

  return { frontmatter, body: match[2] }
}

function markdownToHtml(md: string): string {
  let html = md

  // headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-primary mt-2 mb-3">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-primary mt-2 mb-3">$1</h1>')

  // bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>")

  // unordered list
  html = html.replace(
    /^- (.+)$/gm,
    '<li class="ml-4 list-disc text-muted-foreground leading-relaxed">$1</li>'
  )
  // wrap consecutive <li> into <ul>
  html = html.replace(
    /(<li[^>]*>.*?<\/li>\n?)+/g,
    (match) => `<ul class="my-2 space-y-1">${match}</ul>`
  )

  // links
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" class="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // inline code
  html = html.replace(/`(.+?)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-sm text-primary">$1</code>')

  // paragraphs: wrap remaining non-tag lines
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("<")) return trimmed
      return `<p class="text-muted-foreground leading-relaxed mb-2">${trimmed}</p>`
    })
    .join("\n")

  return html
}

function isWithinPeriod(startDate: string, endDate: string): boolean {
  const now = new Date()
  const start = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T23:59:59")
  return now >= start && now <= end
}

const DISMISS_KEY = "notice-dismissed"

export default function NoticePopup() {
  const [notice, setNotice] = useState<NoticeData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    async function loadNotice() {
      try {
        const res = await fetch("/api/notice")
        if (!res.ok) return
        const raw = await res.text()

        const { frontmatter, body } = parseFrontmatter(raw)
        const { startDate, endDate, title } = frontmatter as unknown as NoticeFrontmatter

        if (!startDate || !endDate) return
        if (!isWithinPeriod(startDate, endDate)) return

        const dismissed = sessionStorage.getItem(DISMISS_KEY)
        if (dismissed === `${startDate}_${endDate}`) return

        const html = markdownToHtml(body)
        setNotice({ frontmatter: { startDate, endDate, title: title || "공지사항" }, html })
        setVisible(true)
      } catch {
        // silently fail
      }
    }
    loadNotice()
  }, [])

  function handleClose() {
    setVisible(false)
  }

  function handleTodayClose() {
    setVisible(false)
    if (notice) {
      sessionStorage.setItem(
        DISMISS_KEY,
        `${notice.frontmatter.startDate}_${notice.frontmatter.endDate}`
      )
    }
  }

  if (!visible || !notice) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg border border-border rounded-lg bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">{notice.frontmatter.title}</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Period badge */}
        <div className="px-5 pt-4">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {notice.frontmatter.startDate} ~ {notice.frontmatter.endDate}
          </span>
        </div>

        {/* Content */}
        <div
          className="px-5 py-4 max-h-80 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: notice.html }}
        />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            onClick={handleTodayClose}
            className="text-muted-foreground border border-border hover:bg-secondary hover:text-foreground"
          >
            오늘 하루 보지 않기
          </Button>
          <Button
            onClick={handleClose}
            className="bg-primary text-primary-foreground border border-primary hover:bg-primary/80"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  )
}
