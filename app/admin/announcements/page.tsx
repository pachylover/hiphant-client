"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { adminFetch } from "@/lib/admin-auth"
import type { Announcement, ListResult } from "@/lib/api"

interface AnnouncementForm {
  message: string
  level: string
  linkUrl: string
  isActive: boolean
  startsAt: string
  endsAt: string
}

const EMPTY: AnnouncementForm = {
  message: "",
  level: "INFO",
  linkUrl: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
}

const LEVEL_LABEL: Record<string, string> = {
  INFO: "안내",
  WARNING: "주의",
  SUCCESS: "완료",
}
const LEVEL_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  INFO: "secondary",
  WARNING: "destructive",
  SUCCESS: "default",
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}
function localInputToIso(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminFetch<ListResult<Announcement>>("/v1/admin/announcements")
      setItems(res.list ?? [])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY)
    setDialogOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      message: a.message,
      level: a.level || "INFO",
      linkUrl: a.linkUrl ?? "",
      isActive: a.isActive,
      startsAt: isoToLocalInput(a.startsAt),
      endsAt: isoToLocalInput(a.endsAt),
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.message.trim()) {
      setError("문구 내용은 필수입니다.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        message: form.message.trim(),
        level: form.level,
        linkUrl: form.linkUrl || null,
        isActive: form.isActive,
        startsAt: localInputToIso(form.startsAt),
        endsAt: localInputToIso(form.endsAt),
      }
      if (editingId == null) {
        await adminFetch("/v1/admin/announcements", { method: "POST", body: JSON.stringify(payload) })
      } else {
        await adminFetch(`/v1/admin/announcements/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    try {
      await adminFetch(`/v1/admin/announcements/${deleteId}`, { method: "DELETE" })
      setDeleteId(null)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">안내문구 관리</h1>
          <p className="text-sm text-muted-foreground">사이트 상단에 노출되는 안내 문구를 관리합니다.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" />새 안내문구
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 안내문구가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Badge variant={LEVEL_VARIANT[a.level] ?? "secondary"} className="shrink-0">
                  {LEVEL_LABEL[a.level] ?? a.level}
                </Badge>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm">{a.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.isActive ? "default" : "secondary"} className="text-[10px]">
                      {a.isActive ? "활성" : "비활성"}
                    </Badge>
                    {a.linkUrl && <span className="truncate text-xs text-muted-foreground">{a.linkUrl}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label="수정" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="삭제" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId == null ? "새 안내문구" : "안내문구 수정"}</DialogTitle>
            <DialogDescription>사이트 상단 바에 노출될 문구를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-message">문구 내용 *</Label>
              <Textarea
                id="ann-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">안내</SelectItem>
                    <SelectItem value="WARNING">주의</SelectItem>
                    <SelectItem value="SUCCESS">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>활성</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>링크 URL</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://... (선택)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>노출 시작</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>노출 종료</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>안내문구를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
