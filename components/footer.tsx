import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background">
      <div className="container py-8 mx-auto">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} HiPhant. All rights reserved.</p>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                개인정보 처리 방침
              </Link>
              <Link
                href="mailto:hiphant.contact@gmail.com"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Contact
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/pachylover/pachy-highlight-frontend"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 .296c-6.63 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.111.82-.261.82-.58 0-.287-.011-1.244-.017-2.252-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.333-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.653.243 2.874.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.804 5.624-5.476 5.921.43.372.814 1.102.814 2.222 0 1.606-.014 2.901-.014 3.293 0 .322.216.697.825.579C20.565 22.092 24 17.592 24 12.296c0-6.627-5.373-12-12-12" />
                </svg>
              </a>

              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="size-4" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60.104 4.552A58.5 58.5 0 0 0 46.323.8a41.619 41.619 0 0 0-1.98 4.05 55.771 55.771 0 0 0-14.708 0A41.59 41.59 0 0 0 26.676.8 58.498 58.498 0 0 0 11.895 4.552C4.64 19.236 5.46 33.6 8 41.84 16.052 46.72 23.84 48.04 31.36 47.76a25.24 25.24 0 0 0 6.88-1.44c.528-.18 1.032-.38 1.52-.6 4.8.24 11.56-.8 19.44-5.84 2.52-8.24 3.34-22.6-3.2-37.12zM23.04 36.76c-3.28 0-5.88-3-5.88-6.7 0-3.7 2.64-6.7 5.88-6.7s5.88 3 5.88 6.7c0 3.7-2.6 6.7-5.88 6.7zm25.92 0c-3.28 0-5.88-3-5.88-6.7 0-3.7 2.64-6.7 5.88-6.7s5.88 3 5.88 6.7c0 3.7-2.6 6.7-5.88 6.7z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
