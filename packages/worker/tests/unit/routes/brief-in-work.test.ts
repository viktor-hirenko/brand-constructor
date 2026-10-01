import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { BRAND_BRIEF_STATUS_TRANSITIONS } from '@brand-constructor/shared'
import { STATUS_TRANSITIONS } from '../../../src/utils/brands'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import {
  ADMIN_URL,
  CONCEPT_ORDER,
  NAMING_ORDER,
  brandRow,
  createBrandApp,
  eventTypes,
  insertBrand,
} from '../../helpers/brandApp'

/**
 * Brief status `in_work` — brief-orders plan, phase 1, server side.
 * Holes: H-01 (a brief in work could not reach the CEO), H-02 (sent and
 * approved without an External Naming), H-15 (the CEO could act on a brief in
 * work), H-23 (a double click sent every message twice). Ids in
 * `docs/design-audit/brief-holes.md`.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

async function json(res: Response): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
  return (await res.json()) as never
}

describe('status transitions', () => {
  it('the wizard mirror equals the server map', () => {
    expect(BRAND_BRIEF_STATUS_TRANSITIONS).toEqual(STATUS_TRANSITIONS)
  })

  it('nobody moves a brief in work except to the CEO; submitted never loops onto itself', () => {
    expect(STATUS_TRANSITIONS.in_work).toEqual(['submitted'])
    expect(STATUS_TRANSITIONS.submitted).not.toContain('submitted')
  })
})

d('draft → in_work («Відправити в роботу»)', () => {
  it('moves a draft with an order to in_work without counting a submission', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(200)
    const row = brandRow(app.db)
    expect(row.status).toBe('in_work')
    expect(row.sent_to_work_at).toBeTruthy()
    expect(row.submit_count).toBe(0)
    expect(row.submitted_at).toBeNull()
    expect(eventTypes(app.db)).toEqual(['sent_to_work'])
  })

  it('sends the same four messages as before, buttons to the Admin, none for PR and Design', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    await app.settle()
    expect(app.slack.map(m => m.channel).sort()).toEqual(['C_APPROVALS', 'C_DESIGN', 'C_PR', 'C_STRATEGY'])
    const byChannel = Object.fromEntries(app.slack.map(m => [m.channel, m]))
    const button = (ch: string) =>
      byChannel[ch].blocks?.find(b => b.type === 'actions')?.elements?.find(e => e.text.text === 'Відкрити бриф')
    expect(button('C_APPROVALS')?.url).toBe(`${ADMIN_URL}/workspace/brand/brand_1`)
    expect(button('C_STRATEGY')?.url).toBe(`${ADMIN_URL}/workspace/brand/brand_1`)
    expect(button('C_PR')).toBeUndefined()
    expect(button('C_DESIGN')).toBeUndefined()
    // the order message is kept for the «скасовано» reply of phase 3
    const row = brandRow(app.db)
    expect(row.orders_slack_channel).toBe('C_STRATEGY')
    expect(row.orders_slack_ts).toMatch(/^17000000\./)
  })

  it('refuses a brief with no order: it goes to the CEO instead', async () => {
    const app = createBrandApp()
    insertBrand(app.db)
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(400)
    expect(brandRow(app.db).status).toBe('draft')
  })

  it('only the author sends it', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { new_concept_brief: CONCEPT_ORDER })
    const res = await app.request('po2', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(403)
  })

  it('a stale tab asking draft → submitted with an order is told to reload (F5)', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { new_concept_brief: CONCEPT_ORDER })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
    expect(res.status).toBe(400)
    expect((await json(res)).error).toContain('F5')
    expect(brandRow(app.db).status).toBe('draft')
  })
})

d('double click / second tab (H-23)', () => {
  it('two draft → in_work at once: one 200, one 409, every message exactly once', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    const [a, b] = await Promise.all([
      app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' }),
      app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    await app.settle()
    expect(app.slack).toHaveLength(4)
    expect(eventTypes(app.db)).toEqual(['sent_to_work'])
  })

  it('two approvals at once: one wins, the team messages go out once', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'submitted', submit_count: 1 })
    const [a, b] = await Promise.all([
      app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status: 'approved' }),
      app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status: 'approved' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    await app.settle()
    expect(app.slack).toHaveLength(4)
    expect(eventTypes(app.db)).toEqual(['approved'])
  })
})

d('PUT while in_work (H-01)', () => {
  function put(app: ReturnType<typeof createBrandApp>, body: Record<string, unknown>) {
    return app.request('po', 'PUT', '/api/brands/brand_1', body)
  }

  it('the author swaps the ordered concept for a library pick and drops the order', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    const res = await put(app, {
      conceptId: 'cpt_sunrise',
      externalNamingIds: ['ext_bubbleton'],
      newConceptBrief: null,
      mode: 'light',
    })
    expect(res.status).toBe(200)
    const row = brandRow(app.db)
    expect(row.concept_id).toBe('cpt_sunrise')
    expect(row.new_concept_brief).toBeNull()
    expect(row.status).toBe('in_work')
  })

  it('the same order sent back unchanged (key order aside) passes', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', new_concept_brief: CONCEPT_ORDER })
    const reordered = Object.fromEntries(Object.entries(CONCEPT_ORDER).reverse())
    const res = await put(app, { newConceptBrief: reordered, conceptComment: 'note' })
    expect(res.status).toBe(200)
  })

  it('adding or changing an order is refused', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', new_concept_brief: CONCEPT_ORDER })
    const changed = await put(app, { newConceptBrief: { ...CONCEPT_ORDER, competitors: 'Other' } })
    expect(changed.status).toBe(400)
    const added = await put(app, { newNamingBrief: NAMING_ORDER })
    expect(added.status).toBe(400)
    const internal = await put(app, {
      stepData: { internalNaming: { selectedId: null, comment: '', newNamingFeedback: 'make it short' } },
    })
    expect(internal.status).toBe(400)
    expect(JSON.parse(String(brandRow(app.db).new_concept_brief))).toEqual(CONCEPT_ORDER)
  })

  it('switching light/dark is refused', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', new_concept_brief: CONCEPT_ORDER, mode: 'light' })
    const res = await put(app, { mode: 'dark' })
    expect(res.status).toBe(400)
    expect(brandRow(app.db).mode).toBe('light')
  })

  it('a submitted brief stays closed to the wizard', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'submitted' })
    const res = await put(app, { conceptComment: 'late edit' })
    expect(res.status).toBe(409)
    // a second tab opened before the brief was sent: plain «reload», not a status dump
    expect((await json(res)).error).toBe('Бриф змінено — оновіть сторінку.')
  })
})

d('in_work → submitted («На погодження CEO»)', () => {
  it('a whole brief with nothing on order goes to the CEO as submission #1', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work' })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
    expect(res.status).toBe(200)
    const row = brandRow(app.db)
    expect(row.status).toBe('submitted')
    expect(row.submit_count).toBe(1)
    await app.settle()
    expect(app.slack.map(m => m.channel)).toEqual(['C_APPROVALS'])
    expect(app.slack[0].text).toContain('Новий бриф на розгляд')
  })

  it('refused while an order is still on the brief', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', new_naming_brief: NAMING_ORDER })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
    expect(res.status).toBe(400)
  })

  it('refused with names of another concept (H-02)', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', concept_id: 'cpt_wonka', external_naming_ids: ['ext_bubbleton'] })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
    expect(res.status).toBe(400)
    expect((await json(res)).error).toContain('Bubbleton')
  })

  it('refused without an External Naming or an Internal Naming (H-02)', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', external_naming_ids: [] })
    expect((await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })).status).toBe(400)
    const app2 = createBrandApp()
    insertBrand(app2.db, { status: 'in_work', internal_naming_id: null })
    expect((await app2.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })).status).toBe(400)
  })

  it('a naming with no concept at all is not «another concept’s»', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work', external_naming_ids: ['ext_free'] })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
    expect(res.status).toBe(200)
  })
})

d('the CEO and a brief in work (H-15)', () => {
  it('cannot approve it or send it back', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work' })
    for (const status of ['approved', 'needs_revision']) {
      const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status })
      expect(res.status).toBe(400)
    }
    expect(brandRow(app.db).status).toBe('in_work')
  })

  it('cannot save alternatives on it', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'in_work' })
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/ceo-selections', {
      ceoSelections: { concept: 'cpt_wonka' },
    })
    expect(res.status).toBe(400)
  })
})

d('approval checks the final choice', () => {
  it('a concept from the CEO alone, with the author’s names of the old concept, is refused', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'submitted', submit_count: 1, ceo_selections: { concept: 'cpt_wonka' } })
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status: 'approved' })
    expect(res.status).toBe(400)
    expect(brandRow(app.db).status).toBe('submitted')
    const used = app.db.raw.prepare("SELECT COUNT(*) AS n FROM concepts WHERE status = 'used'").get() as { n: number }
    expect(used.n).toBe(0)
  })

  it('the CEO’s concept with her names of that concept is approved and marked used', async () => {
    const app = createBrandApp()
    insertBrand(app.db, {
      status: 'submitted',
      submit_count: 1,
      ceo_selections: { concept: 'cpt_wonka', externalNaming: ['ext_wonkaland'] },
    })
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status: 'approved' })
    expect(res.status).toBe(200)
    const row = brandRow(app.db)
    expect(row.concept_id).toBe('cpt_wonka')
    const wonka = app.db.raw.prepare("SELECT status, used_in_brand_id FROM concepts WHERE id = 'cpt_wonka'").get()
    expect(wonka).toEqual({ status: 'used', used_in_brand_id: 'brand_1' })
  })

  it('a returned brief that carries an order cannot be approved', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { status: 'needs_revision', submit_count: 1, new_concept_brief: CONCEPT_ORDER })
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', { status: 'approved' })
    expect(res.status).toBe(400)
  })
})

d('Slack failure never fails the action', () => {
  it('PATCH answers 200 and the History gets slack_failed for the channel', async () => {
    const app = createBrandApp()
    app.failChannels.add('C_STRATEGY')
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(200)
    await app.settle()
    expect(eventTypes(app.db)).toEqual(['sent_to_work', 'slack_failed'])
    const meta = app.db.raw
      .prepare("SELECT meta FROM brand_workflow_events WHERE event_type = 'slack_failed'")
      .get() as { meta: string }
    expect(JSON.parse(meta.meta)).toMatchObject({ kind: 'strategy', channel: 'C_STRATEGY' })
    expect(brandRow(app.db).orders_slack_ts).toBeNull()
  })
})
