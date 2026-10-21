"use client"

import { useTransition, type ComponentProps, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { LoadingOverlay } from "@/components/loading-state"

export function NavigationForm({ children, action, loadingLabel, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: string; loadingLabel?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const qs = new URLSearchParams()
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string") qs.append(key, value)
    })
    const href = `${action}?${qs}`
    startTransition(() => {
      if (href === window.location.pathname + window.location.search) router.refresh()
      else router.push(href)
    })
  }
  return <>
    <form {...props} action={action} onSubmit={submit} aria-busy={pending}>
      <fieldset disabled={pending} className="contents">{children}</fieldset>
    </form>
    {pending && createPortal(<LoadingOverlay label={loadingLabel} />, document.body)}
  </>
}
