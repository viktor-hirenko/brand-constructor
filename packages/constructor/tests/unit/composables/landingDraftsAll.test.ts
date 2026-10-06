import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLandingDrafts } from '@/composables/useLandingDrafts'

/**
 * H-36 (run 02.10: T-012): «Список чернеток» on the landing asked for one page
 * of 20 and showed only those — the PO on the stand has 111 drafts, and the
 * rest could not be opened from the wizard at all.
 *
 * The fake server below is `GET /api/brands` as the worker answers it: it
 * honours `page` / `per_page`, orders newest first and reports `total`. It
 * stands in for `fetch`, not for `useApi`, so the test does not care which
 * helper the composable calls — only what ends up in the list.
 *
 * Red on the old code: 20 drafts instead of 111.
 */

const TOTAL = 111
const SERVER_DRAFTS = Array.from({ length: TOTAL }, (_, i) => ({
  id: `brand-${i + 1}`,
  status: 'draft',
  internalName: `Draft ${i + 1}`,
}))

const requested: URL[] = []

function fakeBrandsList(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(String(input), 'http://stand.local')
  requested.push(url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const perPage = parseInt(url.searchParams.get('per_page') || '20')
  const data = SERVER_DRAFTS.slice((page - 1) * perPage, page * perPage)
  return Promise.resolve(
    new Response(JSON.stringify({ success: true, data, total: TOTAL, page, perPage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

beforeEach(() => {
  requested.length = 0
  vi.stubGlobal('fetch', vi.fn(fakeBrandsList))
  // `onMounted` outside a component only warns; the test calls `fetchDrafts` itself.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('landing drafts list — every draft of the author, not the latest 20', () => {
  it('lists all 111 drafts, newest first, each once', async () => {
    const { drafts, fetchDrafts } = useLandingDrafts(() => true)
    await fetchDrafts()

    expect(drafts.value).toHaveLength(TOTAL)
    expect(drafts.value[0].id).toBe('brand-1')
    expect(drafts.value[TOTAL - 1].id).toBe(`brand-${TOTAL}`)
    expect(new Set(drafts.value.map(d => d.id)).size).toBe(TOTAL)
  })

  it('asks only for drafts on every page it requests', async () => {
    const { fetchDrafts } = useLandingDrafts(() => true)
    await fetchDrafts()

    expect(requested.length).toBeGreaterThan(0)
    for (const url of requested) {
      expect(url.pathname).toBe('/api/brands')
      expect(url.searchParams.get('status')).toBe('draft')
    }
  })

  it('stops paging once the server total is reached', async () => {
    const { fetchDrafts } = useLandingDrafts(() => true)
    await fetchDrafts()

    const perPage = parseInt(requested[0].searchParams.get('per_page') || '20')
    expect(requested).toHaveLength(Math.ceil(TOTAL / perPage))
  })

  it('still asks nothing when the list is not shown', async () => {
    const { drafts, fetchDrafts } = useLandingDrafts(() => false)
    await fetchDrafts()

    expect(requested).toHaveLength(0)
    expect(drafts.value).toEqual([])
  })
})
