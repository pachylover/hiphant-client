"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
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

export default function NoticePage() {
  const [notice, setNotice] = useState<NoticeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadNotice() {
      try {
        const res = await fetch("/api/notice")
        if (!res.ok) {
          setIsLoading(false)
          return
        }
        const raw = await res.text()

        const { frontmatter, body } = parseFrontmatter(raw)
        const { startDate, endDate, title } = frontmatter as unknown as NoticeFrontmatter

        const html = markdownToHtml(body)
        setNotice({ frontmatter: { startDate, endDate, title: title || "공지사항" }, html })
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    loadNotice()
  }, [])

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

        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
              <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
              <div className="space-y-2 mt-6">
                <div className="h-4 w-full bg-secondary rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ) : notice ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-4">{notice.frontmatter.title}</h1>
              
              {notice.frontmatter.startDate && notice.frontmatter.endDate && (
                <div className="mb-6">
                  <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {notice.frontmatter.startDate} ~ {notice.frontmatter.endDate}
                  </span>
                </div>
              )}

              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: notice.html }}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">등록된 공지사항이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
