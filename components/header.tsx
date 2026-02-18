"use client"

import Image from "next/image"
import Link from "next/link"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80" aria-label="HiPhant 홈으로 이동">
          <div className="relative w-[120px] h-[40px] flex-shrink-0">
            <Image
              src={theme === "dark" ? "/assets/images/common/logo.w.png" : "/assets/images/common/logo.b.png"}
              alt="HiPhant 로고"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" aria-label="테마 전환">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
