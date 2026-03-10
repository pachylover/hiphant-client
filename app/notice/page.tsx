"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface NoticeMeta {
  id: string
  date: string
  title: string
  filename: string
}

interface NoticeDetail {
  title: string
  date: string
  html: string
}

function markdownToHtml(md: string): string {
  let html = md

  // headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-foreground mt-6 mb-3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-primary mt-8 mb-4">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-primary mt-8 mb-4">$1</h1>')

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
    (match) => `<ul class="my-3 space-y-2">${match}</ul>`
  )

  // links
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" class="text-accent underline hover:opacity-80" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // inline code
  html = html.replace(/`(.+?)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-sm text-accent">$1</code>')

  // paragraphs: wrap remaining non-tag lines
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("<")) return trimmed
      return `<p class="text-muted-foreground leading-relaxed mb-3">${trimmed}</p>`
    })
    .join("\n")

  return html
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function NoticePage() {
  const [notices, setNotices] = useState<NoticeMeta[]>([])
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  useEffect(() => {
    async function loadNotices() {
      try {
        const res = await fetch("/api/notice")
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        const data = await res.json()
        setNotices(data)
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    loadNotices()
  }, [])

  async function handleSelectNotice(notice: NoticeMeta) {
    setIsDetailLoading(true)
    try {
      const res = await fetch(`/api/notice?file=${encodeURIComponent(notice.filename)}`)
      if (!res.ok) {
        setIsDetailLoading(false)
        return
      }
      const raw = await res.text()
      const { frontmatter, body } = parseFrontmatter(raw)
      const html = markdownToHtml(body)

      setSelectedNotice({
        title: frontmatter.title || notice.title,
        date: frontmatter.date || notice.date,
        html,
      })
    } catch {
      // silently fail
    } finally {
      setIsDetailLoading(false)
    }
  }

  function handleBack() {
    setSelectedNotice(null)
  }

  return (
    <div className="container py-8 mx-auto">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          {selectedNotice ? (
            <Button variant="ghost" className="gap-2 pl-0 hover:pl-0" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Button>
          ) : (
            <Link href="/">
              <Button variant="ghost" className="gap-2 pl-0 hover:pl-0">
                <ArrowLeft className="h-4 w-4" />
                돌아가기
              </Button>
            </Link>
          )}
        </div>

        {!selectedNotice ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">공지사항</h1>
              <p className="text-muted-foreground">
                HiPhant의 최신 소식과 업데이트를 확인하세요.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-6 w-8 bg-secondary rounded" />
                      <div className="h-6 flex-1 bg-secondary rounded" />
                      <div className="h-6 w-24 bg-secondary rounded" />
                    </div>
                  ))}
                </div>
              ) : notices.length > 0 ? (
                <ul className="divide-y divide-border">
                  {notices.map((notice, index) => (
                    <li key={notice.id}>
                      <button
                        onClick={() => handleSelectNotice(notice)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-accent w-8 shrink-0">
                          {notices.length - index}
                        </span>
                        <span className="flex-1 font-medium text-foreground truncate">
                          {notice.title}
                        </span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {formatDate(notice.date)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">등록된 공지사항이 없습니다.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            {isDetailLoading ? (
              <div className="space-y-4">
                <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                <div className="space-y-2 mt-6">
                  <div className="h-4 w-full bg-secondary rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {selectedNotice.title}
                </h1>
                <p className="text-sm text-muted-foreground mb-6">
                  {formatDate(selectedNotice.date)}
                </p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedNotice.html }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
