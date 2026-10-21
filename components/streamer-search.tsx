"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchStreamers, type Streamer } from "@/lib/api"

export function StreamerSearch() {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<Streamer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    const timer = setTimeout(() => {
      searchStreamers(query.trim(), controller.signal).then(list => {
        if (!controller.signal.aborted) setItems(list)
      }).catch(() => {
        if (!controller.signal.aborted) setError(true)
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [query, attempt])

  return <div className="space-y-4">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Search className="h-5 w-5" />스트리머 찾아보기</h2>
    <div className="relative">
      <Search aria-hidden="true" className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
      <Input aria-label="스트리머 닉네임 검색" placeholder="스트리머 닉네임 검색" value={query} onChange={e => setQuery(e.target.value)} className="h-13 pl-12" maxLength={100} />
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading ? <p className="text-sm text-muted-foreground">스트리머를 불러오는 중...</p> : error ? <p className="text-sm text-destructive">스트리머를 불러오지 못했습니다. <button className="underline" onClick={() => setAttempt(n => n + 1)}>다시 시도</button></p> : !items.length ? <p className="text-sm text-muted-foreground">{query.trim() ? "검색 결과가 없습니다." : "등록된 스트리머가 없습니다."}</p> : <ul className="flex flex-wrap gap-2">
        {items.map(item => <li key={item.channelId}><Link href={`/highlights?${new URLSearchParams({ channelId: item.channelId })}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:border-accent hover:text-accent">{item.channelName}<ChevronRight className="h-3 w-3" /></Link></li>)}
      </ul>}
    </div>
  </div>
}
