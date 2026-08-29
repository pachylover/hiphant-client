"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquareText } from "lucide-react"
import type { ChatTimeline, ChatTimelinePoint } from "@/lib/api"

// 라이트/다크 각각 표면 대비 3:1 이상을 만족하도록 globals.css 에서 단계를 나눠 정의한 시리즈 색
const SERIES_COLOR = "var(--chart-series)"

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}시간 ${String(m).padStart(2, "0")}분` : `${m}분`
}

function ChatTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChatTimelinePoint
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-mono text-muted-foreground">{formatClock(point.seconds)} 지점</p>
      <p className="mt-0.5 font-medium tabular-nums text-foreground">채팅 {point.count.toLocaleString()}개</p>
      <p className="mt-1 text-muted-foreground">클릭하면 해당 구간으로 이동합니다</p>
    </div>
  )
}

interface Props {
  videoId: string
  timeline: ChatTimeline
}

/**
 * 분당 채팅량 그래프. 한 점을 클릭하면 치지직 다시보기의 해당 구간이 새 탭으로 열린다.
 * 단일 시리즈이므로 범례 없이 제목이 계열을 설명하고, 최다 구간만 직접 라벨을 단다.
 */
export function ChatVolumeChart({ videoId, timeline }: Props) {
  const points = timeline.points

  const peak = useMemo(() => {
    if (points.length === 0) return null
    return points.reduce((best, p) => (p.count > best.count ? p : best), points[0])
  }, [points])

  const seek = (seconds: number) => {
    window.open(
      `https://chzzk.naver.com/video/${encodeURIComponent(videoId)}?currentTime=${Math.floor(seconds)}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const handleChartClick = (state: any) => {
    const point = state?.activePayload?.[0]?.payload as ChatTimelinePoint | undefined
    if (point) seek(point.seconds)
  }

  if (points.length === 0) return null

  return (
    <Card className="border-border/50">
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4 text-accent" />
          분당 채팅량
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          그래프를 클릭하면 치지직 다시보기의 해당 구간으로 이동합니다. 총 {timeline.totalChats.toLocaleString()}개의 채팅을
          분석했습니다.
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full cursor-pointer">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={points} margin={{ top: 16, right: 12, left: -18, bottom: 0 }} onClick={handleChartClick}>
              <defs>
                <linearGradient id="chatVolumeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                content={<ChatTooltip />}
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
              />

              <Area
                type="monotone"
                dataKey="count"
                name="채팅 수"
                stroke={SERIES_COLOR}
                strokeWidth={2}
                fill="url(#chatVolumeFill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              />

              {/* 최다 구간만 직접 표시 — 모든 점에 숫자를 붙이지 않는다 */}
              {peak && (
                <ReferenceDot
                  x={peak.label}
                  y={peak.count}
                  r={4}
                  fill={SERIES_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  label={{
                    value: `최다 ${peak.count.toLocaleString()}`,
                    position: "top",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 색만으로 정보를 전달하지 않도록: 상위 구간을 텍스트로도 제공하고, 키보드로도 이동 가능하게 한다 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[...points]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((p) => (
              <button
                key={p.minute}
                type="button"
                onClick={() => seek(p.seconds)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
              >
                <span className="font-mono">{formatClock(p.seconds)}</span>
                <span className="ml-1.5 tabular-nums">{p.count.toLocaleString()}개</span>
              </button>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
