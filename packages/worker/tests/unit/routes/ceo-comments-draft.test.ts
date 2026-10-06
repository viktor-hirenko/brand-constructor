import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import brands from '../../../src/routes/brands'
import { createTestD1, hasNodeSqlite, type TestD1 } from '../../helpers/sqliteD1'
import { brandRow, createBrandApp, insertBrand } from '../../helpers/brandApp'

/**
 * The CEO's comments before «Повернути» / «Затвердити».
 *
 * H-04 (run 02.10: D-24): they lived only in the CEO's browser until the
 * status change — another computer showed none. H-30 (D-63): two tabs of the
 * CEO, the return from tab A dropped what was written in tab B. Each comment is
 * now saved on the server while the CEO types (`PATCH /:id/ceo-comments`, one
 * section at a time), and the return keeps what the other tab saved.
 *
 * H-22: `PATCH /:id/status` took `ceoComments` / `ceoSelections` from any role.
 *
 * Real `/api/brands` router over the real schema in SQLite.
 */

const d = hasNodeSqlite ? describe : describe.skip

const USERS = {
  po: { id: 'usr_po', email: 'po@x.test', name: 'Olena PO', role: 'product_owner' },
  ceo: { id: 'usr_ceo', email: 'ceo@x.test', name: 'Ivan CEO', role: 'cpo_ceo' },
} as const

type Who = keyof typeof USERS

interface Body {
  success: boolean
  error?: string
  data?: { ceoComments?: Record<string, { value: string }> | null; ceoSelections?: unknown }
}

const SEEDED_AT = '2026-10-05 09:00:00'

function createApp(seed: { status?: string; ceoComments?: unknown } = {}) {
  const db: TestD1 = createTestD1()
  for (const u of Object.values(USERS)) {
    db.raw
      .prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(u.id, u.email, u.name, u.role)
  }
  db.raw
    .prepare(
      `INSERT INTO brands (id, internal_name, status, created_by, external_naming_ids, ceo_comments,
        created_at, updated_at) VALUES ('brand_1', 'New Brand #7', ?, ?, '[]', ?, ?, ?)`
    )
    .run(
      seed.status ?? 'submitted',
      USERS.po.id,
      seed.ceoComments ? JSON.stringify(seed.ceoComments) : null,
      SEEDED_AT,
      SEEDED_AT
    )

  let current: Who = 'ceo'
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, USERS[current] as never)
    await next()
  })
  app.route('/api/brands', brands as never)

  async function request(who: Who, method: string, path: string, body?: unknown) {
    current = who
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

  const row = () =>
    db.raw
      .prepare("SELECT status, ceo_comments, ceo_selections, updated_at FROM brands WHERE id = 'brand_1'")
      .get() as { status: string; ceo_comments: string | null; ceo_selections: string | null; updated_at: string }

  const stored = () => {
    const raw = row().ceo_comments
    return raw ? (JSON.parse(raw) as Record<string, { value: string; resolved: boolean }>) : null
  }

  return { request, row, stored }
}

const draft = (section: string, value: string) => ({ section, value })

d('the CEO comment is on the server while the CEO types (H-04)', () => {
  it('a section comment is saved and read back by another computer', async () => {
    const app = createApp()
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', 'Темніше'))
    expect(res.status).toBe(200)
    expect(app.stored()).toEqual({ concept: { value: 'Темніше', resolved: false, resolvedAt: null } })

    const other = await app.request('ceo', 'GET', '/api/brands/brand_1')
    expect(other.body.data?.ceoComments?.concept?.value).toBe('Темніше')
  })

  it('an emptied comment is removed', async () => {
    const app = createApp({ ceoComments: { concept: { value: 'x', resolved: false, resolvedAt: null } } })
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', '   '))
    expect(app.stored()).toBeNull()
  })

  it('saving a comment does not change the brief version', async () => {
    const app = createApp()
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('general', 'Ок'))
    expect(app.row().updated_at).toBe(SEEDED_AT)
  })

  it('only the CEO, only while the brief is «На розгляді», only known sections', async () => {
    const po = createApp()
    expect((await po.request('po', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', 'x'))).status).toBe(403)

    const revision = createApp({ status: 'needs_revision' })
    expect((await revision.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', 'x'))).status).toBe(400)

    const unknown = createApp()
    expect((await unknown.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('__proto__', 'x'))).status).toBe(400)
    expect(po.stored()).toBeNull()
    expect(revision.stored()).toBeNull()
    expect(unknown.stored()).toBeNull()
  })
})

d('two CEO tabs: the return keeps what the other tab wrote (H-30)', () => {
  it('tab B saved a comment, tab A returns with its own — both are on the brief', async () => {
    const app = createApp()
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', 'з вкладки A'))
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('internalNaming', 'з вкладки B'))

    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', {
      status: 'needs_revision',
      ceoComments: { concept: 'з вкладки A' },
    })

    expect(res.status).toBe(200)
    expect(app.row().status).toBe('needs_revision')
    expect(app.stored()?.concept?.value).toBe('з вкладки A')
    expect(app.stored()?.internalNaming?.value).toBe('з вкладки B')
  })

  it('what the returning tab sends wins over the saved text of the same section', async () => {
    const app = createApp()
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-comments', draft('concept', 'старе'))
    await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', {
      status: 'needs_revision',
      ceoComments: { concept: 'нове' },
    })
    expect(app.stored()?.concept?.value).toBe('нове')
  })
})

d('only the CEO sends CEO comments and picks with a status change (H-22)', () => {
  it('the author cannot slip «CEO picks» into a submission', async () => {
    const app = createApp({ status: 'draft' })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', {
      status: 'submitted',
      ceoSelections: { concept: 'con_x' },
    })
    expect(res.status).toBe(403)
    expect(app.row().status).toBe('draft')
    expect(app.row().ceo_selections).toBeNull()
  })

  it('nor CEO comments', async () => {
    const app = createApp({ status: 'draft' })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', {
      status: 'submitted',
      ceoComments: { concept: 'від автора' },
    })
    expect(res.status).toBe(403)
    expect(app.stored()).toBeNull()
  })
})


d('«свій варіант» marks end with the round they answered (D-33)', () => {
  it('the author sends the brief back to the CEO — the marks are dropped, the rest of step data stays', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'needs_revision', ceo_selections: { concept: 'cpt_wonka' } })
    app.db.raw
      .prepare(
        `UPDATE brands SET needs_revision_at = '2026-10-05 10:00:00',
           step_data = json_set(step_data, '$.revisionKeptOwn', json('{"concept":"\\"cpt_wonka\\""}'))
         WHERE id = 'brand_1'`
      )
      .run()

    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })

    expect(res.status).toBe(200)
    const stepData = JSON.parse(brandRow(app.db).step_data as string)
    expect(stepData.revisionKeptOwn).toBeUndefined()
    expect(stepData.internalNaming).toEqual({ selectedId: null, comment: '', newNamingFeedback: null })
  })
})
