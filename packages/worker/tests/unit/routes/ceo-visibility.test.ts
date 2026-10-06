import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import { createBrandApp, insertBrand, type BrandApp, type UserKey } from '../../helpers/brandApp'

/**
 * What the CEO and the others read of a brief.
 *
 * H-37 (run 02.10: T-053): the CEO saw «Drafts» in Brands and every author's
 * drafts — `canListAllBrands` gave the CEO everything. Per PRD v2 «Етап 2» the
 * CEO works with a sent brief: the server no longer lists, counts or opens a
 * draft for the approval roles.
 *
 * While a brief is `submitted`, `ceo_comments` are the CEO's unsent draft
 * comments — nobody outside the approval roles reads them until «Повернути»
 * (`needs_revision`) or approval sends them.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

interface ListBody {
  data: { id: string; status: string; ceoComments: unknown }[]
  total: number
}

interface BrandBody {
  success: boolean
  error?: string
  data?: { id: string; status: string; ceoComments: unknown }
}

const CEO_COMMENTS = {
  concept: { value: 'Too dark for AU', resolved: false, resolvedAt: null },
}

/** One brief per status, all by the first Product Owner, plus a draft of the second. */
function seedEveryStatus(app: BrandApp): void {
  insertBrand(app.db, { id: 'b_draft', status: 'draft' })
  insertBrand(app.db, { id: 'b_draft_po2', status: 'draft', created_by: 'usr_po2' })
  insertBrand(app.db, { id: 'b_in_work', status: 'in_work' })
  insertBrand(app.db, { id: 'b_submitted', status: 'submitted' })
  insertBrand(app.db, { id: 'b_revision', status: 'needs_revision' })
  insertBrand(app.db, { id: 'b_approved', status: 'approved' })
}

function setCeoComments(app: BrandApp, id: string): void {
  app.db.raw
    .prepare('UPDATE brands SET ceo_comments = ? WHERE id = ?')
    .run(JSON.stringify(CEO_COMMENTS), id)
}

async function list(app: BrandApp, user: UserKey, query = ''): Promise<ListBody> {
  const res = await app.request(user, 'GET', `/api/brands?per_page=500${query}`)
  expect(res.status).toBe(200)
  return (await res.json()) as ListBody
}

async function getBrand(app: BrandApp, user: UserKey, id: string) {
  const res = await app.request(user, 'GET', `/api/brands/${id}`)
  return { status: res.status, body: (await res.json()) as BrandBody }
}

d('H-37: the CEO does not see drafts', () => {
  it('«All» lists and counts every brief except drafts', async () => {
    const app = createBrandApp()
    seedEveryStatus(app)
    const body = await list(app, 'ceo')
    expect(body.data.map(b => b.status).sort()).toEqual([
      'approved',
      'in_work',
      'needs_revision',
      'submitted',
    ])
    expect(body.total).toBe(4)
  })

  it('the «draft» filter answers empty, with a zero count', async () => {
    const app = createBrandApp()
    seedEveryStatus(app)
    const body = await list(app, 'ceo', '&status=draft')
    expect(body.data).toEqual([])
    expect(body.total).toBe(0)
  })

  it('a draft opened by its link is «not found», as any brief a role may not read', async () => {
    const app = createBrandApp()
    seedEveryStatus(app)
    const res = await getBrand(app, 'ceo', 'b_draft')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, error: 'Brand not found' })
  })

  it('a brief in work still opens for the CEO — the wizard shows «Бриф ще в роботі»', async () => {
    const app = createBrandApp()
    seedEveryStatus(app)
    expect((await getBrand(app, 'ceo', 'b_in_work')).status).toBe(200)
  })

  it('the admin and the author keep their drafts', async () => {
    const app = createBrandApp()
    seedEveryStatus(app)
    const admin = await list(app, 'admin', '&status=draft')
    expect(admin.data.map(b => b.id).sort()).toEqual(['b_draft', 'b_draft_po2'])
    expect(admin.total).toBe(2)
    expect((await getBrand(app, 'admin', 'b_draft')).status).toBe(200)

    const po = await list(app, 'po', '&status=draft')
    expect(po.data.map(b => b.id)).toEqual(['b_draft'])
    expect((await getBrand(app, 'po', 'b_draft')).status).toBe(200)
  })
})

d('the CEO\'s comments on a submitted brief stay with the CEO', () => {
  it('the author, the admin and the list do not get them while the brief is submitted', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_submitted', status: 'submitted' })
    setCeoComments(app, 'b_submitted')

    for (const user of ['po', 'admin'] as const) {
      const one = await getBrand(app, user, 'b_submitted')
      expect(one.status).toBe(200)
      expect(one.body.data!.ceoComments).toBeNull()
      const all = await list(app, user)
      expect(all.data.find(b => b.id === 'b_submitted')!.ceoComments).toBeNull()
    }
  })

  it('the CEO reads her own comments back', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_submitted', status: 'submitted' })
    setCeoComments(app, 'b_submitted')
    expect((await getBrand(app, 'ceo', 'b_submitted')).body.data!.ceoComments).toEqual(CEO_COMMENTS)
    const all = await list(app, 'ceo')
    expect(all.data.find(b => b.id === 'b_submitted')!.ceoComments).toEqual(CEO_COMMENTS)
  })

  it('a brief sent back or approved shows the comments to everyone who reads it', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_revision', status: 'needs_revision' })
    insertBrand(app.db, { id: 'b_approved', status: 'approved' })
    setCeoComments(app, 'b_revision')
    setCeoComments(app, 'b_approved')

    expect((await getBrand(app, 'po', 'b_revision')).body.data!.ceoComments).toEqual(CEO_COMMENTS)
    expect((await getBrand(app, 'po', 'b_approved')).body.data!.ceoComments).toEqual(CEO_COMMENTS)
    expect((await getBrand(app, 'strategy', 'b_approved')).body.data!.ceoComments).toEqual(
      CEO_COMMENTS
    )
  })

  it('the author\'s «На погодження CEO» answer does not carry them either', async () => {
    const app = createBrandApp()
    // A draft never returned by the CEO keeps `ceo_comments` on submit (only a
    // returned brief clears them) — whatever the row holds, the answer to the
    // author must not show it once the brief is submitted.
    insertBrand(app.db, { id: 'b_draft', status: 'draft' })
    setCeoComments(app, 'b_draft')
    const res = await app.request('po', 'PATCH', '/api/brands/b_draft/status', {
      status: 'submitted',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as BrandBody
    expect(body.data!.status).toBe('submitted')
    expect(body.data!.ceoComments).toBeNull()
    await app.settle()
  })
})
