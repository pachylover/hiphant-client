"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, ImageIcon, Megaphone, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { verifyToken, clearToken } from "@/lib/admin-auth"

const NAV = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/admin/banners", label: "배너 관리", icon: ImageIcon, exact: false },
  { href: "/admin/announcements", label: "안내문구 관리", icon: Megaphone, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === "/admin/login"
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true)
      return
    }
    let active = true
    verifyToken().then((ok) => {
      if (!active) return
      if (!ok) {
        router.replace("/admin/login")
      } else {
        setChecked(true)
      }
    })
    return () => {
      active = false
    }
  }, [isLoginPage, pathname, router])

  const handleLogout = () => {
    clearToken()
    router.replace("/admin/login")
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  if (!checked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 px-2">
            <h2 className="text-lg font-bold">관리자</h2>
            <p className="text-xs text-muted-foreground">HiPhant Admin</p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="mt-2 justify-start gap-3 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
