"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Film, MessageSquare, Sparkles, TrendingUp } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { adminFetch } from "@/lib/admin-auth"
import type { DataResult, ListResult, RecentHighlight, StatsResponse } from "@/lib/api"

// globals.css 에서 라이트/다크별로 표면 대비 3:1 이상을 만족하도록 정의한 시리즈 색
const SERIES_COLOR = "var(--chart-series)"

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </CardContent>
    </Card>
  )
}

const TYPE_LABEL: Record<string, string> = {
  NORMAL: "기본",
  LAUGH: "ㅋㅋㅋ",
  QUESTION: "갈고리",
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("ko-KR", { hour12: false })
  } catch {
    return iso
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [recent, setRecent] = useState<RecentHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      adminFetch<DataResult<StatsResponse>>("/v1/admin/stats"),
      adminFetch<ListResult<RecentHighlight>>("/v1/admin/highlights/recent?limit=20"),
    ])
      .then(([statsRes, recentRes]) => {
        if (!active) return
        setStats(statsRes.data)
        setRecent(recentRes.list ?? [])
      })
      .catch((err) => {
        if (active) setError((err as Error).message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">서비스 통계와 최근 생성된 하이라이트를 확인합니다.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="분석된 영상" value={stats.totalVideos.toLocaleString()} icon={Film} />
            <StatCard label="총 하이라이트" value={stats.totalHighlights.toLocaleString()} icon={Sparkles} />
            <StatCard label="총 채팅" value={stats.totalChats.toLocaleString()} icon={MessageSquare} />
            <StatCard label="오늘 생성" value={stats.highlightsToday.toLocaleString()} icon={Clock} />
            <StatCard label="최근 7일" value={stats.highlightsLast7Days.toLocaleString()} icon={TrendingUp} />
          </>
        )}
      </div>

      {/* 추이 차트 + 상위 영상 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">최근 14일 하이라이트 생성 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !stats ? (
              <Skeleton className="h-[260px] w-full" />
            ) : stats.dailyTrend.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.dailyTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5)}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="count" name="생성 수" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">상위 영상 (하이라이트 수)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading || !stats ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : stats.topVideos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              stats.topVideos.map((v, i) => (
                <a
                  key={v.videoId}
                  href={`https://chzzk.naver.com/video/${encodeURIComponent(v.videoId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary"
                >
                  <span className="text-sm font-semibold text-accent">{i + 1}</span>
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{v.videoId}</span>
                  <span className="text-sm font-medium tabular-nums">{v.highlightCount}</span>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 최근 생성 하이라이트 (하단) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 생성된 하이라이트</CardTitle>
          <p className="text-xs text-muted-foreground">영상별로 가장 최근 하이라이트 1건만 표시합니다.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">최근 생성된 하이라이트가 없습니다.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {recent.map((h) => {
                const seconds = h.minute != null ? Math.floor(h.minute / 1000) : 0
                const href = `https://chzzk.naver.com/video/${encodeURIComponent(h.videoId)}?currentTime=${seconds}`
                return (
                  <a
                    key={h.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-secondary/50"
                  >
                    <Badge variant="secondary" className="shrink-0">
                      {TYPE_LABEL[h.highlightType ?? "NORMAL"] ?? h.highlightType}
                    </Badge>
                    {/* 영상 제목이 주 식별자. 백필 전 데이터만 videoId 로 대체된다. */}
                    <span className="min-w-0 flex-1 truncate text-sm" title={h.videoTitle ?? undefined}>
                      {h.videoTitle ?? h.videoId}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                      {h.title ?? "하이라이트"}
                    </span>
                    <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
                      {h.videoId}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                  </a>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
