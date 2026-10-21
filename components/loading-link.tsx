"use client"

import type { ComponentProps } from "react"
import Link, { useLinkStatus } from "next/link"
import { createPortal } from "react-dom"
import { LoadingOverlay } from "@/components/loading-state"

function PendingLink({ label }: { label?: string }) {
  const { pending } = useLinkStatus()
  return pending ? createPortal(<LoadingOverlay label={label} />, document.body) : null
}

export function LoadingLink({ children, loadingLabel, prefetch = false, ...props }: ComponentProps<typeof Link> & { loadingLabel?: string }) {
  return <Link {...props} prefetch={prefetch}>{children}<PendingLink label={loadingLabel} /></Link>
}
