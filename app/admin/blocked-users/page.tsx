"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Plus, Search, Trash2 } from "lucide-react"
import { adminFetch } from "@/lib/admin-auth"
import type { BlockedUser, BlockedUserPreview, DataResult, ListResult } from "@/lib/api"

interface BlockedUserForm {
  uid: string
  nickname: string
  memo: string
}

const EMPTY: BlockedUserForm = { uid: "", nickname: "", memo: "" }

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("ko-KR", { hour12: false })
  } catch {
    return iso
  }
}

export default function AdminBlockedUsersPage() {
  const [items, setItems] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<BlockedUserForm>(EMPTY)
  const [preview, setPreview] = useState<BlockedUserPreview | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminFetch<ListResult<BlockedUser>>("/v1/admin/blocked-users")
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
    setForm(EMPTY)
    setPreview(null)
    setDialogOpen(true)
  }

  // 등록 전 확인 — 이 uid 로 저장된 채팅 수와 닉네임을 보여준다
  const checkUid = async () => {
    const uid = form.uid.trim()
    if (!uid) return
    setChecking(true)
    try {
      const res = await adminFetch<DataResult<BlockedUserPreview>>(
        `/v1/admin/blocked-users/preview?uid=${encodeURIComponent(uid)}`,
      )
      setPreview(res.data)
      // 닉네임을 입력하지 않았다면 확인된 닉네임을 채워준다
      if (!form.nickname && res.data?.nicknames?.length) {
        setForm((f) => ({ ...f, nickname: res.data.nicknames[0] }))
      }
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setChecking(false)
    }
  }

  const save = async () => {
    const uid = form.uid.trim()
    if (!uid) {
      setError("uid 는 필수입니다.")
      return
    }
    setSaving(true)
    try {
      await adminFetch("/v1/admin/blocked-users", {
        method: "POST",
        body: JSON.stringify({
          uid,
          nickname: form.nickname.trim() || null,
          memo: form.memo.trim() || null,
        }),
      })
      setDialogOpen(false)
      setError(null)
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
      await adminFetch(`/v1/admin/blocked-users/${deleteId}`, { method: "DELETE" })
      setDeleteId(null)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">비수집 회원 관리</h1>
          <p className="text-sm text-muted-foreground">
            수집을 원하지 않는다고 요청한 회원의 uid 를 등록합니다. 등록하면 저장된 채팅이 즉시 삭제되고, 이후 수집에서도
            제외됩니다.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" />새 비수집 회원
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
            등록된 비수집 회원이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.nickname ?? "닉네임 미상"}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      채팅 {u.deletedChats.toLocaleString()}건 삭제됨
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">{u.uid}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                    {u.memo ? ` · ${u.memo}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="등록 해제"
                  className="shrink-0"
                  onClick={() => setDeleteId(u.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 등록 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>비수집 회원 등록</DialogTitle>
            <DialogDescription>
              uid 는 치지직 채널 URL 뒤의 긴 문자열입니다. 등록하면 해당 회원의 채팅이 DB 에서 삭제되며 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blocked-uid">uid *</Label>
              <div className="flex gap-2">
                <Input
                  id="blocked-uid"
                  value={form.uid}
                  onChange={(e) => {
                    setForm({ ...form, uid: e.target.value })
                    setPreview(null)
                  }}
                  placeholder="예: 6e0d0aa1b2c3..."
                  className="font-mono"
                />
                <Button variant="outline" onClick={checkUid} disabled={checking || !form.uid.trim()} className="gap-2">
                  <Search className="h-4 w-4" />
                  {checking ? "확인 중" : "확인"}
                </Button>
              </div>
              {preview && (
                <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>
                    저장된 채팅 <span className="font-medium text-foreground">{preview.chatCount.toLocaleString()}</span>건
                    {preview.alreadyBlocked && " · 이미 등록된 uid 입니다"}
                  </p>
                  <p className="mt-1">
                    확인된 닉네임: {preview.nicknames.length > 0 ? preview.nicknames.join(", ") : "없음"}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocked-nickname">닉네임</Label>
              <Input
                id="blocked-nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="요청자가 알려준 닉네임 (선택)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocked-memo">메모</Label>
              <Input
                id="blocked-memo"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="요청 일자, 메일 주소 등 (선택)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={save} disabled={saving} className="bg-destructive text-white hover:bg-destructive/90">
              {saving ? "처리 중..." : "등록하고 채팅 삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 등록 해제 확인 */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>비수집 등록을 해제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              해제하면 이후 수집에 다시 포함됩니다. 이미 삭제된 채팅은 복구되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
