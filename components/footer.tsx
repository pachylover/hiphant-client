import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background">
      <div className="container py-8 mx-auto">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} HiPhant. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              개인정보 처리 방침
            </Link>
            <Link
              href="mailto:hiphant.biz@gmail.com"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
