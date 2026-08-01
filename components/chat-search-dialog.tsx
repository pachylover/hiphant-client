"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, MessageSquareText, Clock, User, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchChats, type ChatSearchItem, type ChatSearchMode, type PageResult } from "@/lib/api"

function formatToHHMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts = h > 0 ? [h, m, sec] : [m, sec]
  return parts.map((p) => String(p).padStart(2, "0")).join(":")
}

interface Props {
  videoId: string
  trigger?: React.ReactNode
}

export function ChatSearchDialog({ videoId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [username, setUsername] = useState("")
  const [mode, setMode] = useState<ChatSearchMode>("partial")
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<PageResult<ChatSearchItem> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const runSearch = async (targetPage: number, searchMode: ChatSearchMode = mode) => {
    if (!keyword.trim() && !username.trim()) {
      setError("검색어 또는 닉네임을 입력해주세요.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await searchChats(videoId, {
        keyword: keyword.trim(),
        username: username.trim(),
        mode: searchMode,
        page: targetPage,
        size: 30,
      })
      setResult(res)
      setPage(targetPage)
      setSearched(true)
    } catch (err) {
      setError((err as Error).message || "검색 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <MessageSquareText className="h-4 w-4" />
            채팅 검색
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>채팅 검색</DialogTitle>
          <DialogDescription>
            이 영상의 채팅을 검색합니다. 키워드 또는 닉네임으로 찾을 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="shrink-0 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="chat-keyword" className="text-xs">
                키워드 (메시지)
              </Label>
              <Input
                id="chat-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 하이라이트"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chat-username" className="text-xs">
                닉네임
              </Label>
              <Input
                id="chat-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="닉네임별 검색"
              />
            </div>
          </div>

          {/* 매칭 방식: 부분 일치 / 정확히 일치 */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">매칭 방식</span>
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1">
              {(
                [
                  { value: "partial", label: "부분 일치" },
                  { value: "exact", label: "정확히 일치" },
                ] as { value: ChatSearchMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  aria-pressed={mode === opt.value}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    mode === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mode === "partial"
                ? "입력한 글자가 포함된 채팅을 모두 찾습니다."
                : "입력한 내용과 정확히 일치하는 채팅만 찾습니다."}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            검색
          </Button>
        </form>

        {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}

        {searched && result && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60">
            <div className="shrink-0 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
              총 <span className="font-semibold text-foreground">{result.total.toLocaleString()}</span>개 결과
            </div>

            {/* 결과 목록 (스크롤 영역) */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {result.list.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {result.list.map((c) => {
                    const seconds = c.seconds ?? 0
                    const href = `https://chzzk.naver.com/video/${encodeURIComponent(
                      videoId,
                    )}?currentTime=${seconds}`
                    return (
                      <li key={c.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-3 p-3 transition-colors hover:bg-secondary/50"
                        >
                          <span className="mt-0.5 flex shrink-0 items-center gap-1 font-mono text-xs text-accent">
                            <Clock className="h-3 w-3" />
                            {formatToHHMMSS(seconds)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate">{c.username || "익명"}</span>
                            </div>
                            <p className="break-words text-sm">{c.message}</p>
                          </div>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* 페이지네이션 (목록과 분리된 하단 바) */}
            {result.totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 bg-card px-3 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0 || loading}
                  onClick={() => runSearch(page - 1)}
                >
                  이전
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page + 1} / {result.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= result.totalPages - 1 || loading}
                  onClick={() => runSearch(page + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
