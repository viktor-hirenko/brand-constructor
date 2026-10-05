import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import brands from '../../../src/routes/brands'
import { BRIEF_CHANGED_MESSAGE } from '../../../src/utils/brief-checks'
import { createTestD1, hasNodeSqlite, type TestD1 } from '../../helpers/sqliteD1'
import { CONCEPT_ORDER } from '../../helpers/brandApp'

/**
 * Two tabs of one draft (H-29, run 02.10: D-60). Tab B, opened before tab A
 * saved, picked other names and pressed «Далі» — and silently overwrote A.
 * Each save now says which version of the brief the tab saw
 * (`expectedUpdatedAt`); a brief saved elsewhere since answers 409 «Бриф
 * змінено — оновіть сторінку.». Real `/api/brands` router over the real schema
 * in SQLite: the conditional UPDATE is what decides a race.
 */

const d = hasNodeSqlite ? describe : describe.skip

const USERS = {
  po: { id: 'usr_po', email: 'po@x.test', name: 'Olena PO', role: 'product_owner' },
} as const

const SEEDED_AT = '2026-10-05 09:00:00'

interface Body {
  success: boolean
  error?: string
  data?: { updatedAt: string; externalNamingIds?: string[]; ceoComments?: unknown }
}

function createApp(seed: { status?: string; ceoComments?: unknown } = {}) {
  const db: TestD1 = createTestD1()
  db.raw
    .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
    .run(USERS.po.id, USERS.po.email, USERS.po.name, USERS.po.role)
  db.raw
    .prepare(
      `INSERT INTO brands (id, internal_name, status, created_by, external_naming_ids, ceo_comments,
        created_at, updated_at) VALUES ('brand_1', 'New Brand #7', ?, ?, '[]', ?, ?, ?)`
    )
    .run(
      seed.status ?? 'draft',
      USERS.po.id,
      seed.ceoComments ? JSON.stringify(seed.ceoComments) : null,
      SEEDED_AT,
      SEEDED_AT
    )

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, USERS.po as never)
    await next()
  })
  app.route('/api/brands', brands as never)

  async function request(method: string, path: string, body?: unknown) {
    const res = await app.request(
      path,
      {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      { DB: db } as never,
      { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as never
    )
    return { status: res.status, body: (await res.json()) as Body }
  }

  const names = () =>
    JSON.parse(
      (db.raw.prepare("SELECT external_naming_ids FROM brands WHERE id = 'brand_1'").get() as {
        external_naming_ids: string
      }).external_naming_ids
    ) as string[]

  return { request, names }
}

/** What step 3 «Далі» sends: the picked names on top of the version the tab saw. */
function step3Save(names: string[], expectedUpdatedAt?: string) {
  return { externalNamingIds: names, currentStep: 4, expectedUpdatedAt }
}

d('a save carries the version of the brief the tab saw (H-29)', () => {
  it('D-60: tab B, opened before tab A saved, does not overwrite A — it is told to reload', async () => {
    const { request, names } = createApp()
    const tabA = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    const tabB = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt

    const a = await request('PUT', '/api/brands/brand_1', step3Save(['ext_pixellia'], tabA))
    expect(a.status).toBe(200)

    const b = await request('PUT', '/api/brands/brand_1', step3Save(['ext_retropix'], tabB))
    expect(b.status).toBe(409)
    expect(b.body.error).toBe(BRIEF_CHANGED_MESSAGE)
    expect(BRIEF_CHANGED_MESSAGE).toBe('Бриф змінено — оновіть сторінку.')
    expect(names()).toEqual(['ext_pixellia'])
  })

  it('after a reload tab B saves on top of A', async () => {
    const { request, names } = createApp()
    const stale = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    await request('PUT', '/api/brands/brand_1', step3Save(['ext_pixellia'], stale))

    const reloaded = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    const b = await request('PUT', '/api/brands/brand_1', step3Save(['ext_retropix'], reloaded))
    expect(b.status).toBe(200)
    expect(names()).toEqual(['ext_retropix'])
  })

  it('one tab saving step after step is never refused: each save answers the next version', async () => {
    const { request, names } = createApp()
    let version = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    for (const pick of [['ext_a'], ['ext_b'], ['ext_c']]) {
      const res = await request('PUT', '/api/brands/brand_1', step3Save(pick, version))
      expect(res.status).toBe(200)
      expect(res.body.data!.updatedAt).not.toBe(version)
      version = res.body.data!.updatedAt
    }
    expect(names()).toEqual(['ext_c'])
  })

  it('two tabs pressing «Далі» at the same moment: one saves, the other is told to reload', async () => {
    const { request, names } = createApp()
    const seen = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    const [a, b] = await Promise.all([
      request('PUT', '/api/brands/brand_1', step3Save(['ext_pixellia'], seen)),
      request('PUT', '/api/brands/brand_1', step3Save(['ext_retropix'], seen)),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const winner = a.status === 200 ? ['ext_pixellia'] : ['ext_retropix']
    expect(names()).toEqual(winner)
  })

  it('a tab still on an older wizard build (no version sent) saves as before', async () => {
    const { request, names } = createApp()
    const res = await request('PUT', '/api/brands/brand_1', step3Save(['ext_old']))
    expect(res.status).toBe(200)
    expect(names()).toEqual(['ext_old'])
  })

  it('marking a CEO comment «Вирішено» is a new version: the next save carries the one it answered', async () => {
    const { request } = createApp({
      status: 'needs_revision',
      ceoComments: { concept: { value: 'Take Wonka', resolved: false, resolvedAt: null } },
    })
    const loaded = (await request('GET', '/api/brands/brand_1')).body.data!.updatedAt
    const resolved = await request('PATCH', '/api/brands/brand_1/ceo-comments/resolve', {
      section: 'concept',
      resolved: true,
    })
    expect(resolved.status).toBe(200)
    const afterResolve = resolved.body.data!.updatedAt
    expect(afterResolve).not.toBe(loaded)

    expect((await request('PUT', '/api/brands/brand_1', step3Save(['ext_a'], loaded))).status).toBe(409)
    expect((await request('PUT', '/api/brands/brand_1', step3Save(['ext_a'], afterResolve))).status).toBe(200)
  })
})

d('a stale tab of a brief in work (H-32, run 02.10: D-64)', () => {
  it('is told to reload, not an order rule it did not break', async () => {
    // The order the tab still holds was dropped elsewhere (a library concept
    // picked in another tab); resending it used to answer «замовлення концепту
    // не можна додати чи змінити». The version check comes before that rule.
    const { request } = createApp({ status: 'in_work' })
    const res = await request('PUT', '/api/brands/brand_1', {
      newConceptBrief: CONCEPT_ORDER,
      expectedUpdatedAt: '2026-10-01T08:00:00.000Z',
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe(BRIEF_CHANGED_MESSAGE)
  })
})
