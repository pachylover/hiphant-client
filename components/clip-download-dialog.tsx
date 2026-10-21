"use client"

import { LoadingState } from "@/components/loading-state"
import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatClipTime, parseClipTime, isValidClipRange, stepClipTime } from "@/lib/clip/edit-range"
import { formatToHHMMSS } from "@/lib/highlights"
import { ClipSessionError, createClipSession, getClipSource, selectRendition, type ClipSession } from "@/lib/clip/session"

interface Props {
  videoId: string
  startSeconds: number
  endSeconds: number
  videoDuration?: number
  title: string
  channelName: string
  mobile: boolean
  onClose: () => void
}

type Phase = "IDLE" | "RESOLVING" | "ANALYZING" | "DOWNLOADING" | "PACKAGING" | "SAVING" | "DONE" | "CANCELED" | "ERROR"
const labels: Record<Phase, string> = {
  IDLE: "다운로드 준비", RESOLVING: "영상 정보 확인 중", ANALYZING: "구간 분석 중",
  DOWNLOADING: "구간 다운로드 중", PACKAGING: "MP4 구성 중", SAVING: "파일 저장 중",
  DONE: "파일 저장을 요청했습니다", CANCELED: "다운로드를 취소했습니다", ERROR: "다운로드하지 못했습니다",
}
const busyPhases: Phase[] = ["RESOLVING", "ANALYZING", "DOWNLOADING", "PACKAGING", "SAVING"]
const NAVER_SESSION_STORAGE_KEY = "hiphant_naver_session"
const bytesLabel = (bytes: number) => `${Math.ceil(bytes / 1024 / 1024)} MB`

export function ClipDownloadDialog(props: Props) {
  const [startSeconds, setStartSeconds] = useState(props.startSeconds)
  const [endSeconds, setEndSeconds] = useState(props.endSeconds)
  const [startTime, setStartTime] = useState(() => formatClipTime(props.startSeconds))
  const [endTime, setEndTime] = useState(() => formatClipTime(props.endSeconds))
  const [storageMessage, setStorageMessage] = useState("")
  const [storageError, setStorageError] = useState("")
  const [nidAut, setNidAut] = useState("")
  const [nidSes, setNidSes] = useState("")
  const [showSession, setShowSession] = useState(false)
  const [phase, setPhase] = useState<Phase>("IDLE")
  const [session, setSession] = useState<ClipSession | null>(null)
  const [quality, setQuality] = useState("")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [actualRange, setActualRange] = useState<{ startSeconds: number; endSeconds: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)
  const objectUrlRef = useRef<string | null>(null)
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxBytes = (props.mobile ? 300 : 1000) * 1024 * 1024
  const busy = busyPhases.includes(phase)
  const duration = session?.durationSeconds || props.videoDuration || null
  const validRange = isValidClipRange(startSeconds, endSeconds, duration)
  const validSession = (!nidAut && !nidSes) || (!!nidAut.trim() && !!nidSes.trim())
  const editRange = (kind: "start" | "end", value: number, text = formatClipTime(value)) => {
    if (busy) return
    if (kind === "start") { setStartSeconds(value); setStartTime(text) }
    else { setEndSeconds(value); setEndTime(text) }
    setSession(null)
    setQuality("")
    setActualRange(null)
    setPhase("IDLE")
    setError("")
  }
  const saveSession = () => {
    setStorageError("")
    setStorageMessage("")
    try {
      localStorage.setItem(NAVER_SESSION_STORAGE_KEY, JSON.stringify({ nidAut: nidAut.trim(), nidSes: nidSes.trim() }))
      setStorageMessage("이 브라우저에 세션 정보를 저장했습니다.")
    } catch { setStorageError("브라우저 저장소를 사용할 수 없습니다. 이번 다운로드에는 입력값을 사용할 수 있습니다.") }
  }
  const clearSession = () => {
    setNidAut(""); setNidSes(""); setStorageMessage(""); setStorageError("")
    try {
      localStorage.removeItem(NAVER_SESSION_STORAGE_KEY)
      setStorageMessage("브라우저에 저장된 세션 정보를 삭제했습니다.")
    } catch { setStorageError("저장된 세션 정보를 삭제하지 못했습니다. 브라우저의 사이트 데이터 설정에서 삭제해주세요.") }
  }
  const selected = session?.renditions.find(r => r.id === quality)

  const releaseUrl = () => {
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    cleanupTimerRef.current = null
  }

  const run = async (preferredId = quality) => {
    if (abortRef.current || !validRange || !validSession) return
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal
    setError("")
    setActualRange(null)
    setProgress(0)
    releaseUrl()
    try {
      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)
        || startSeconds < 0 || endSeconds <= startSeconds || endSeconds - startSeconds > 600) {
        throw new Error("다운로드 구간이 올바르지 않습니다. 최대 10분까지 다운로드할 수 있습니다.")
      }
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          setPhase("RESOLVING")
          const resolved = await createClipSession(props.videoId, startSeconds, endSeconds, signal, nidAut && nidSes ? { nidAut: nidAut.trim(), nidSes: nidSes.trim() } : undefined)
          signal.throwIfAborted()
          setSession(resolved)
          const rendition = selectRendition(resolved, preferredId, maxBytes)
          setQuality(rendition.id)
          setPhase("ANALYZING")
          const source = await getClipSource(resolved.sessionId, rendition.id, signal)
          const [{ downloadClip }, { buildClipFilename }] = await Promise.all([
            import("@/lib/clip/downloader"), import("@/lib/clip/filename"),
          ])
          signal.throwIfAborted()
          const output = await downloadClip({
            source, startSeconds: startSeconds, endSeconds: endSeconds,
            signal, maxBytes,
            onProgress: p => {
              if (signal.aborted || !mountedRef.current) return
              setPhase(p.phase)
              setProgress(p.total > 0 ? Math.min(100, Math.round(p.completed / p.total * 100)) : 0)
            },
          })
          signal.throwIfAborted()
          setPhase("SAVING")
          const url = URL.createObjectURL(output.blob)
          objectUrlRef.current = url
          const anchor = document.createElement("a")
          anchor.href = url
          anchor.download = buildClipFilename(resolved.channelName, resolved.title, output.startSeconds, output.endSeconds, output.extension)
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          // Allow the browser to consume the Blob before releasing it.
          cleanupTimerRef.current = setTimeout(releaseUrl, 30_000)
          setActualRange(output)
          setProgress(100)
          setPhase("DONE")
          break
        } catch (failure) {
          signal.throwIfAborted()
          const status = failure instanceof ClipSessionError ? failure.status
            : typeof failure === "object" && failure !== null && "status" in failure ? Number(failure.status) : 0
          if (attempt === 0 && [403, 404, 410, 429].includes(status)) continue
          throw failure
        }
      }
    } catch (failure) {
      releaseUrl()
      if (!mountedRef.current) return
      if (signal.aborted) {
        setPhase("CANCELED")
      } else {
        setPhase("ERROR")
        // Never display raw network errors, which can contain signed media URLs.
        const message = failure instanceof ClipSessionError
          ? `${failure.message}${failure.requestId ? ` (요청 ID: ${failure.requestId})` : ""}`
          : failure instanceof Error && /[가-힣]/.test(failure.message) && !/https?:|\?|token|signature/i.test(failure.message)
            ? failure.message : "미디어를 가져오지 못했습니다. 네트워크 또는 브라우저 지원 여부를 확인하고 낮은 화질로 다시 시도해주세요."
        setError(message)
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  useEffect(() => {
    mountedRef.current = true
    try {
      const stored = localStorage.getItem(NAVER_SESSION_STORAGE_KEY)
      if (stored) {
        const saved = JSON.parse(stored)
        if (typeof saved?.nidAut === "string" && typeof saved?.nidSes === "string"
          && saved.nidAut.length <= 4096 && saved.nidSes.length <= 4096) {
          setNidAut(saved.nidAut); setNidSes(saved.nidSes)
        }
      }
    } catch { setStorageError("브라우저에 저장된 세션 정보를 불러오지 못했습니다.") }
    const cancel = () => abortRef.current?.abort()
    window.addEventListener("pagehide", cancel)
    return () => {
      mountedRef.current = false
      cancel()
      releaseUrl()
      window.removeEventListener("pagehide", cancel)
    }
    // The parent mounts a fresh dialog for each selected range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => { abortRef.current?.abort(); props.onClose() }
  return (
    <Dialog open onOpenChange={open => { if (!open) close() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>구간 다운로드</DialogTitle>
          <DialogDescription>선택한 영상의 구간을 브라우저에서 처리합니다. 키프레임 경계에 따라 실제 구간이 달라질 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="break-words font-medium">{session?.title || props.title}</p>
          <p>{session?.channelName || props.channelName}</p>
          <p>요청 구간: {validRange ? `${formatToHHMMSS(startSeconds)} ~ ${formatToHHMMSS(endSeconds)} (${endSeconds - startSeconds}초)` : "구간을 확인해주세요"}</p>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="font-medium">구간 조절 (시:분:초)</legend>
            {(["start", "end"] as const).map(kind => {
              const value = kind === "start" ? startSeconds : endSeconds
              const label = kind === "start" ? "시작" : "종료"
              const max = duration ?? Math.max(props.endSeconds, Number.isFinite(endSeconds) ? endSeconds : 0, 600)
              return <div key={kind} className="space-y-1">
                <label htmlFor={`clip-${kind}`}>{label} 시간 (시:분:초)</label>
                <input id={`clip-${kind}`} type="text" placeholder="00:00:00" autoComplete="off" spellCheck={false}
                  className="w-full rounded-md border bg-background p-2 font-mono" value={kind === "start" ? startTime : endTime}
                  aria-invalid={!Number.isFinite(value)}
                  onChange={event => editRange(kind, parseClipTime(event.target.value), event.target.value)}
                  onWheel={event => {
                    if (document.activeElement !== event.currentTarget || !event.deltaY) return
                    editRange(kind, stepClipTime(value, event.deltaY, kind === "start" ? 0 : 1, max))
                  }} />
                <input type="range" aria-label={`${label} 시간 슬라이더`} min={kind === "start" ? 0 : 1} max={max} step={1}
                  className="w-full" value={Number.isFinite(value) ? value : 0} onChange={event => editRange(kind, Number(event.target.value))} />
              </div>
            })}
            <p className="text-xs text-muted-foreground">시:분:초 형식(예: 01:02:03)으로 입력하거나 슬라이더를 움직이세요. 입력칸에 초점을 두고 휠을 돌리면 1초씩 조절됩니다. 최대 10분.</p>
            {!validRange && <p role="alert" className="text-destructive">영상 내에서 시작보다 종료가 늦은 1~600초 구간을 입력해주세요.</p>}
          </fieldset>
          <Button variant="outline" disabled={busy} onClick={() => setShowSession(!showSession)} aria-expanded={showSession}>네이버 세션 정보 입력 (선택)</Button>
          {showSession && <fieldset disabled={busy} className="space-y-2 rounded-md border p-3">
            <legend>네이버 세션</legend>
            <p className="text-xs text-muted-foreground">연령 제한 영상의 성인 인증에 사용하는 네이버 세션입니다. 저장 시 이 브라우저에 보관하며, 서버에는 저장하지 않습니다.</p>
            <label htmlFor="naver-aut">NID_AUT</label>
            <input id="naver-aut" type="password" autoComplete="off" maxLength={4096} spellCheck={false} className="w-full rounded-md border bg-background p-2" value={nidAut} onChange={event => { setNidAut(event.target.value); setStorageMessage("") }} />
            <label htmlFor="naver-ses">NID_SES</label>
            <input id="naver-ses" type="password" autoComplete="off" maxLength={4096} spellCheck={false} className="w-full rounded-md border bg-background p-2" value={nidSes} onChange={event => { setNidSes(event.target.value); setStorageMessage("") }} />
            {!validSession && <p role="alert">두 세션 값을 모두 입력하거나 모두 비워주세요.</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!nidAut.trim() || !nidSes.trim()} onClick={saveSession}>이 브라우저에 저장</Button>
              <Button variant="outline" onClick={clearSession}>저장된 세션 정보 삭제</Button>
            </div>
            {storageMessage && <p role="status" className="text-xs text-muted-foreground">{storageMessage}</p>}
            {storageError && <p role="alert" className="text-xs text-destructive">{storageError}</p>}
          </fieldset>}
          <p className="text-muted-foreground">용량 제한 {bytesLabel(maxBytes)} · 메모리는 파일 크기의 수 배까지 필요할 수 있습니다. {props.mobile ? "모바일에서는 큰 파일 저장이 실패할 수 있습니다." : "완료될 때까지 이 창을 유지해주세요."}</p>
          {session && (
            <div className="space-y-2">
              <label htmlFor="clip-quality">화질</label>
              <select id="clip-quality" className="w-full rounded-md border bg-background p-2" value={quality} disabled={busy} onChange={event => setQuality(event.target.value)}>
                {session.renditions.map(r => <option key={r.id} value={r.id}>{r.height ? `${r.height}p` : r.id}{r.estimatedBytes != null ? ` · 약 ${bytesLabel(r.estimatedBytes)}` : " · 크기 미확인"}</option>)}
              </select>
              <p>예상 파일 크기: {selected?.estimatedBytes != null ? bytesLabel(selected.estimatedBytes) : "확인 중 (실제 수신량에도 용량 제한 적용)"}</p>
            </div>
          )}
          {busy ? <LoadingState label={labels[phase]} className="justify-start py-1" /> : <p role="status" aria-live="polite">{labels[phase]}</p>}
          <Progress value={progress} aria-label="다운로드 진행률" />
          {error && <p role="alert" className="text-destructive break-words">{error}</p>}
          {actualRange && <p>실제 구간: {formatToHHMMSS(Math.floor(actualRange.startSeconds))} ~ {formatToHHMMSS(Math.ceil(actualRange.endSeconds))}. 브라우저의 다운로드 목록을 확인해주세요.</p>}
          <div className="flex justify-end gap-2">
            {busy ? <Button variant="outline" onClick={() => abortRef.current?.abort()}>다운로드 취소</Button>
              : <Button disabled={!validRange || !validSession} onClick={() => void run()}>{phase === "IDLE" ? "다운로드 시작" : phase === "DONE" ? "다시 다운로드" : "재시도"}</Button>}
            <Button variant="outline" onClick={close}>닫기</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
