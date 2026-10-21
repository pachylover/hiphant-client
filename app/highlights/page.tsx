import { LoadingLink as Link } from "@/components/loading-link"
import { cache, Suspense } from "react"
import { PageLoading } from "@/components/page-loading"
import { NavigationForm } from "@/components/navigation-form"
import { createPageMetadata } from "@/lib/metadata"
import { HighlightCards } from "@/components/highlight-cards"
import { fetchHighlightPage } from "@/lib/api"

export const revalidate = 0

type Params = { query?: string; channelId?: string; page?: string }
type PageProps = { searchParams: Promise<Params> }

function normalizeParams(params: Params) {
  const pageNumber = Number(params.page ?? 1)
  return {
    page: Number.isSafeInteger(pageNumber) && pageNumber > 0 ? Math.min(pageNumber - 1, 100000) : 0,
    query: (params.query ?? "").trim().slice(0, 100),
    channelId: (params.channelId ?? "").trim(),
  }
}

// Metadata and the rendered list share one request, including failure handling.
const loadHighlights = cache((query: string, channelId: string, page: number) =>
  fetchHighlightPage({ query, channelId, page }).catch(() => null),
)

export async function generateMetadata({ searchParams }: PageProps) {
  const { query, channelId, page } = normalizeParams(await searchParams)
  const result = await loadHighlights(query, channelId, page)
  const channelName = channelId ? result?.list[0]?.channelName : null
  const subject = channelId
    ? `${channelName || "스트리머"} 하이라이트${query ? ` · “${query}” 검색 결과` : ""}`
    : query ? `“${query}” 스트리머 검색 결과` : "생성된 하이라이트 전체보기"
  const description = channelId
    ? `${channelName || "선택한 스트리머"}의 생성된 치지직 방송 하이라이트를 최신순으로 확인하세요.`
    : query ? `“${query}” 이름으로 검색한 스트리머의 생성된 치지직 방송 하이라이트입니다.`
    : "이미 생성된 치지직 방송 하이라이트를 최신순으로 둘러보고 스트리머 이름으로 검색하세요."
  const qs = new URLSearchParams()
  if (query) qs.set("query", query)
  if (channelId) qs.set("channelId", channelId)
  if (page > 0) qs.set("page", String(page + 1))
  return createPageMetadata({
    title: `${subject}${page > 0 ? ` · ${page + 1}페이지` : ""} | HiPhant`,
    description,
    path: `/highlights${qs.size ? `?${qs}` : ""}`,
    noindex: Boolean(query || channelId || !result || !result.list.length),
  })
}

export default async function HighlightsPage({ searchParams }: PageProps) {
  const params = normalizeParams(await searchParams)
  return <Suspense key={JSON.stringify(params)} fallback={<PageLoading label="하이라이트 목록을 불러오는 중입니다" />}>
    <HighlightResults {...params} />
  </Suspense>
}

async function HighlightResults({ query, channelId, page }: ReturnType<typeof normalizeParams>) {
  const result = await loadHighlights(query, channelId, page)
  const pageLink = (index: number) => `/highlights?${new URLSearchParams({ query, ...(channelId ? { channelId } : {}), page: String(index + 1) })}`
  return <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <div><h1 className="text-2xl font-bold">생성된 하이라이트</h1><p className="mt-2 text-sm text-muted-foreground">{channelId ? "선택한 스트리머의 방송을 최신 생성순으로 확인하세요." : "하이라이트가 생성된 방송을 최신순으로 확인하세요."}</p></div>
    <NavigationForm key={`${query}:${channelId}`} action="/highlights" loadingLabel="하이라이트를 검색하는 중입니다" className="flex flex-wrap gap-2">
      {channelId && <input type="hidden" name="channelId" value={channelId} />}
      <input aria-label="스트리머 이름 검색" name="query" defaultValue={query} maxLength={100} placeholder="스트리머 이름 검색" className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-4 text-sm" />
      <button className="rounded-lg bg-accent px-5 text-sm font-medium text-accent-foreground">검색</button>
      {(query || channelId) && <Link href="/highlights?query=&page=1" className="self-center px-2 text-sm underline">전체 목록</Link>}
    </NavigationForm>
    {!result ? <div role="alert" className="rounded-xl border p-8 text-center"><p>목록을 불러오지 못했습니다.</p><Link href={pageLink(page)} className="mt-3 inline-block underline">다시 시도</Link></div> : <>
      <p className="text-sm text-muted-foreground">총 {result.total}개 방송</p>
      {result.list.length ? <HighlightCards items={result.list} /> : <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{query || channelId ? "검색 결과가 없습니다." : "아직 생성된 하이라이트가 없습니다."}</p>}
      {result.totalPages > 0 && <nav aria-label="하이라이트 페이지 이동" className="flex items-center justify-center gap-5 pt-4">
        {page > 0 && <Link href={pageLink(page - 1)} className="rounded-lg border px-4 py-2 text-sm">이전</Link>}
        <span className="text-sm">{page + 1} / {result.totalPages}</span>
        {page + 1 < result.totalPages && <Link href={pageLink(page + 1)} className="rounded-lg border px-4 py-2 text-sm">다음</Link>}
        {page >= result.totalPages && <Link href={pageLink(0)} className="text-sm underline">첫 페이지</Link>}
      </nav>}
    </>}
  </div>
}
