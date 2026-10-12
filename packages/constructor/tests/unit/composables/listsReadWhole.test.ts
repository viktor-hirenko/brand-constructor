import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiGetAll, useApiList } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'

/**
 * H-59 (found 12.10 while the DP-15450 board was checked live): Final review
 * and the CEO's screen wrote «Назву не обрано» under a name that WAS picked and
 * saved. The review looked the pick up in a library it had read with
 * `per_page=100`, newest first; on the stage the library holds 130 free names
 * and Joymus is the 109th.
 *
 * The owner, 12.10: «Почему только 100 последних? Такого вообще никаких условий
 * не должно быть… Если продуктовый выбрал название или CEO, неважно, они всегда
 * должны отображаться.»
 *
 * The ceiling was never a rule. It came in with the wizard's first commit, when
 * a hundred meant «all», and the same idea stood in every pick list as a 50 or
 * a 100. So no screen reads «one page» any more: a list is read to its end.
 *
 * The fake server below is the worker's four list routes as they answer today:
 * `page` / `per_page` honoured, newest first, `total` reported — concepts capped
 * at 100 a page, namings at 500, and `/api/pr-packages` with no paging and no
 * `total` at all. It stands in for `fetch`, so the tests do not care which
 * helper a screen calls, only what ends up in its list.
 *
 * Red on the old code: 100 names instead of 130 in the store, 50 instead of
 * 120 in a pick list.
 */

interface Row {
  id: string
  name: string
  status: string
  concept_id?: string
}

const rows = (prefix: string, n: number, extra: (i: number) => Partial<Row> = () => ({})): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i + 1}`, name: `${prefix} ${i + 1}`, status: 'active', ...extra(i) }))

const SERVER: Record<string, { rows: Row[]; cap: number | null }> = {
  '/api/concepts': { rows: rows('con', 34), cap: 100 },
  '/api/namings/external': { rows: rows('exn', 130, i => ({ concept_id: i >= 100 ? 'con-wonka' : 'con-other' })), cap: 500 },
  '/api/namings/internal': { rows: rows('inn', 120), cap: 500 },
  // No paging, no `total`: the route answers with everything, every time.
  '/api/pr-packages': { rows: rows('pkg', 6), cap: null },
}

const requested: URL[] = []

function fakeLists(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(String(input), 'http://stand.local')
  requested.push(url)
  const list = SERVER[url.pathname]
  if (!list) return Promise.resolve(new Response(JSON.stringify({ success: false, error: 'Not Found' }), { status: 404 }))

  let all = list.rows
  const conceptId = url.searchParams.get('concept_id')
  if (conceptId) all = all.filter(r => r.concept_id === conceptId)

  const json = (body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))

  if (list.cap === null) return json({ success: true, data: all })

  const page = parseInt(url.searchParams.get('page') || '1')
  const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), list.cap)
  return json({ success: true, data: all.slice((page - 1) * perPage, page * perPage), total: all.length, page, per_page: perPage })
}

beforeEach(() => {
  requested.length = 0
  setActivePinia(createPinia())
  vi.stubGlobal('fetch', vi.fn(fakeLists))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  SERVER['/api/pr-packages'].rows = rows('pkg', 6)
})

describe('H-59: the review knows every name in the library, not the newest hundred', () => {
  it('holds all 130 free names — the 109th, Joymus on the stage, among them', async () => {
    const store = useLibrariesStore()
    await store.load('brand-1')

    expect(store.externalNamings).toHaveLength(130)
    expect(store.externalNamings.find(n => n.id === 'exn-109')).toBeTruthy()
    expect(store.externalNamings[129].id).toBe('exn-130')
    expect(new Set(store.externalNamings.map(n => n.id)).size).toBe(130)
  })

  it('finds a pick wherever it stands in the library — what the review does with the brief’s ids', async () => {
    const store = useLibrariesStore()
    await store.load('brand-1')

    for (const id of ['exn-1', 'exn-100', 'exn-101', 'exn-109', 'exn-130']) {
      expect(store.externalNamings.find(n => n.id === id)?.id).toBe(id)
    }
    expect(store.internalNamings.find(n => n.id === 'inn-120')).toBeTruthy()
  })

  it('reads the other three libraries whole as well', async () => {
    const store = useLibrariesStore()
    await store.load('brand-1')

    expect(store.concepts).toHaveLength(34)
    expect(store.internalNamings).toHaveLength(120)
    expect(store.prPackages).toHaveLength(6)
  })

  it('keeps asking for what this brief may use on every page it requests', async () => {
    const store = useLibrariesStore()
    await store.load('brand-1')

    const external = requested.filter(u => u.pathname === '/api/namings/external')
    expect(external.length).toBeGreaterThan(1)
    for (const url of external) expect(url.searchParams.get('available_for_brand')).toBe('brand-1')
    expect(external.map(u => u.searchParams.get('page'))).toEqual(['1', '2'])
  })
})

describe('a pick list shows every row there is to pick from', () => {
  it('step 4 with `per_page: 50` in its params — all 120 internal names, not 50', async () => {
    const { data, fetchData } = useApiList<Row>('/api/namings/internal')
    await fetchData({ per_page: '50', status: 'active' })

    expect(data.value).toHaveLength(120)
    expect(data.value[119].id).toBe('inn-120')
    for (const url of requested) expect(url.searchParams.get('status')).toBe('active')
  })

  it('a screen that sets `perPage` instead — the same', async () => {
    const { data, total, perPage, fetchData } = useApiList<Row>('/api/namings/internal')
    perPage.value = 100
    await fetchData({ status: 'active' })

    expect(data.value).toHaveLength(120)
    expect(total.value).toBe(120)
  })

  it('names of one concept: the filter rides on every page', async () => {
    const { data, perPage, fetchData } = useApiList<Row>('/api/namings/external')
    perPage.value = 20
    await fetchData({ concept_id: 'con-wonka', status: 'active' })

    expect(data.value).toHaveLength(30)
    expect(data.value.every(n => n.concept_id === 'con-wonka')).toBe(true)
    expect(requested).toHaveLength(2)
    for (const url of requested) expect(url.searchParams.get('concept_id')).toBe('con-wonka')
  })
})

describe('reading a list to its end — the walk itself', () => {
  it('stops on the server’s total: one request per page, no extra one', async () => {
    const all = await apiGetAll<Row>('/api/namings/external?available_for_brand=brand-1', 50)

    expect(all).toHaveLength(130)
    expect(requested).toHaveLength(3)
  })

  it('a server ceiling lower than the page asked for costs requests, not rows', async () => {
    SERVER['/api/concepts'].rows = rows('con', 250)
    try {
      const all = await apiGetAll<Row>('/api/concepts', 500)

      expect(all).toHaveLength(250)
      expect(new Set(all.map(c => c.id)).size).toBe(250)
      expect(requested).toHaveLength(3)
    } finally {
      SERVER['/api/concepts'].rows = rows('con', 34)
    }
  })

  it('a route with no paging and no total is asked once', async () => {
    const all = await apiGetAll<Row>('/api/pr-packages')

    expect(all).toHaveLength(6)
    expect(requested).toHaveLength(1)
  })

  it('such a route with more rows than a page never loops and never doubles them', async () => {
    SERVER['/api/pr-packages'].rows = rows('pkg', 150)
    const all = await apiGetAll<Row>('/api/pr-packages')

    expect(all).toHaveLength(150)
    expect(new Set(all.map(p => p.id)).size).toBe(150)
    expect(requested.length).toBeLessThanOrEqual(2)
  })

  it('an empty page ends the walk even if the total says there is more', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(String(input), 'http://stand.local')
        requested.push(url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const data = page === 1 ? rows('exn', 100) : []
        return Promise.resolve(new Response(JSON.stringify({ success: true, data, total: 999, page, per_page: 100 }), { status: 200 }))
      })
    )
    const all = await apiGetAll<Row>('/api/namings/external')

    expect(all).toHaveLength(100)
    expect(requested).toHaveLength(2)
  })
})
