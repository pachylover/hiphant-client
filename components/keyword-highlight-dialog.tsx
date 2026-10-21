"use client"

import { useEffect, useRef, useState } from "react"
import { LoadingState } from "@/components/loading-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"

interface Props {
  videoId: string
  onHighlightsAdded: (highlights: unknown[]) => void
}

export function KeywordHighlightDialog({ videoId, onHighlightsAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const requestRef = useRef<AbortController | null>(null)
  useEffect(() => () => requestRef.current?.abort(), [])

  const changeOpen = (value: boolean) => {
    if (!value) {
      requestRef.current?.abort()
      requestRef.current = null
      setLoading(false)
    }
    setError("")
    setMessage("")
    setOpen(value)
  }
  const detect = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = keyword.trim()
    if (!value || value.length > 50 || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`${API_BASE_URL}/v1/highlights/${encodeURIComponent(videoId)}/keywords`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: value }), signal: controller.signal,
      })
      if (!response.ok) throw new Error(response.status === 400
        ? "키워드는 공백을 제외한 1~50자로 입력해주세요."
        : "구간을 탐지하지 못했습니다. 잠시 후 다시 시도해주세요.")
      const highlights: unknown = await response.json()
      if (!Array.isArray(highlights)) throw new Error("탐지 결과를 읽을 수 없습니다. 다시 시도해주세요.")
      if (controller.signal.aborted) return
      if (highlights.length) {
        onHighlightsAdded(highlights)
        setOpen(false)
      } else {
        setMessage("키워드가 몰린 구간이 없습니다. 다른 키워드를 입력하거나 저장된 채팅이 있는지 확인해주세요.")
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "구간 탐지에 실패했습니다.")
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild><Button variant="outline">특정 채팅으로 추가</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>키워드 하이라이트 자동 탐지</DialogTitle>
        <DialogDescription>저장된 채팅에서 키워드가 포함된 메시지를 분당 집계해, 2건 이상 발생한 상위 5개 구간을 찾습니다. 영문 대소문자를 구분하지 않습니다.</DialogDescription>
      </DialogHeader>
      <form onSubmit={detect} className="space-y-4">
        <Label htmlFor="highlight-keyword">탐지할 키워드</Label>
        <Input id="highlight-keyword" value={keyword} maxLength={50} disabled={loading} placeholder="예: 레전드"
          onChange={event => { setKeyword(event.target.value); setError(""); setMessage("") }} />
        <p className="text-xs text-muted-foreground">입력한 문구 전체를 하나의 키워드로 찾습니다. 결과는 특정 채팅 탭에 저장되며 같은 키워드를 다시 요청해도 중복 추가되지 않습니다.</p>
        {loading && <LoadingState label="키워드 하이라이트를 탐지하는 중입니다" />}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => changeOpen(false)}>닫기</Button>
          <Button type="submit" disabled={loading || !keyword.trim() || keyword.trim().length > 50}>
            {loading ? "탐지 중..." : "하이라이트 탐지"}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
