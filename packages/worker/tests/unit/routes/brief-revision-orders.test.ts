import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import {
  brandRow,
  CONCEPT_ORDER,
  createBrandApp,
  eventTypes,
  insertBrand,
  type BrandApp,
} from '../../helpers/brandApp'
import { AFTER_CEO_RETURN_NOTE } from '../../../src/utils/slack'

/*
 * An order placed while the brief is back from the CEO — brief-orders plan,
 * phase 4, server side: `needs_revision → in_work`, the four A1–A4 messages
 * marked «після повернення від CEO» (N4), the next send to the CEO counted as a
 * RE-submission by the return itself, and a second round of orders that does
 * not inherit the first round's state.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

async function json(res: Response): Promise<{ success: boolean; data?: any; error?: string }> {
  return (await res.json()) as never
}

const INTERNAL_ORDER = 'Need something shorter'

/** The wizard's save of a brief: the whole thing, every time. */
function wizardSave(overrides: Record<string, unknown>) {
  return {
    conceptId: 'cpt_sunrise',
    externalNamingIds: ['ext_bubbleton'],
    internalNamingId: 'int_one',
    newConceptBrief: null,
    newNamingBrief: null,
    stepData: { internalNaming: { selectedId: 'int_one', comment: '', newNamingFeedback: null } },
    ...overrides,
  }
}

/** A complete brief, sent to the CEO and returned with a comment. */
async function returnedBrief(app: BrandApp): Promise<void> {
  insertBrand(app.db)
  expect((await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })).status).toBe(200)
  const res = await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', {
    status: 'needs_revision',
    ceoComments: { internalNaming: 'Потрібна інша назва' },
    ceoSelections: { concept: 'cpt_wonka' },
  })
  expect(res.status).toBe(200)
  await app.settle()
  app.slack.length = 0
}

/** The author orders a new Internal Naming from the revision screen. */
async function orderInternalOnRevision(app: BrandApp): Promise<void> {
  const res = await app.request(
    'po',
    'PUT',
    '/api/brands/brand_1',
    wizardSave({
      internalNamingId: null,
      stepData: { internalNaming: { selectedId: null, comment: '', newNamingFeedback: INTERNAL_ORDER } },
    })
  )
  expect(res.status, (await json(res.clone())).error).toBe(200)
}

function texts(app: BrandApp): Record<string, string> {
  return Object.fromEntries(
    app.slack.map(m => [m.channel, [m.text, ...(m.blocks ?? []).map(b => b.text?.text ?? '')].join('\n')])
  )
}

d('needs_revision → in_work («Відправити в роботу» from the revision)', () => {
  it('sends the returned brief with an order to the teams, the CEO round kept until the next send', async () => {
    const app = createBrandApp()
    await returnedBrief(app)
    await orderInternalOnRevision(app)

    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status, (await json(res.clone())).error).toBe(200)
    const row = brandRow(app.db)
    expect(row.status).toBe('in_work')
    expect(row.submit_count).toBe(1)
    expect(row.sent_to_work_at).toBeTruthy()
    // what the CEO said stays with the brief while the teams work
    expect(row.ceo_comments).toContain('Потрібна інша назва')
    expect(eventTypes(app.db).at(-1)).toBe('sent_to_work')
  })

  it('A1–A4 go out again, each marked «після повернення від CEO»', async () => {
    const app = createBrandApp()
    await returnedBrief(app)
    await orderInternalOnRevision(app)
    await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    await app.settle()

    expect(app.slack.map(m => m.channel).sort()).toEqual(['C_APPROVALS', 'C_DESIGN', 'C_PR', 'C_STRATEGY'])
    const byChannel = texts(app)
    for (const channel of ['C_APPROVALS', 'C_STRATEGY', 'C_PR', 'C_DESIGN']) {
      expect(byChannel[channel], channel).toContain(`_${AFTER_CEO_RETURN_NOTE}_`)
      expect(byChannel[channel], channel).toContain('(після повернення від CEO)')
    }
    expect(byChannel.C_APPROVALS).toContain('новий internal naming')
    expect(byChannel.C_STRATEGY).toContain(INTERNAL_ORDER)
  })

  it('the first send from a draft carries no such mark', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    await app.settle()
    expect(app.slack).toHaveLength(4)
    for (const text of Object.values(texts(app))) expect(text).not.toContain('після повернення від CEO')
  })

  it('a returned brief with no order still goes to the CEO, not to the teams', async () => {
    const app = createBrandApp()
    await returnedBrief(app)
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(400)
    expect(brandRow(app.db).status).toBe('needs_revision')
  })

  it('only the author sends it', async () => {
    const app = createBrandApp()
    await returnedBrief(app)
    await orderInternalOnRevision(app)
    const res = await app.request('po2', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status).toBe(403)
  })
})

d('the send to the CEO after the round is a re-submission (by the return, not the status)', () => {
  async function pickMadeInternalAndSubmit(app: BrandApp): Promise<Response> {
    const made = await app.request('strategy', 'POST', '/api/namings/internal', {
      name: 'Shorty',
      for_brand_id: 'brand_1',
    })
    const madeBody = await json(made)
    expect(made.status, madeBody.error).toBe(201)
    expect((await app.request('strategy', 'POST', '/api/orders/brand_1/ready')).status).toBe(200)
    const put = await app.request(
      'po',
      'PUT',
      '/api/brands/brand_1',
      wizardSave({
        internalNamingId: madeBody.data.id,
        stepData: { internalNaming: { selectedId: madeBody.data.id, comment: '', newNamingFeedback: null } },
      })
    )
    expect(put.status, (await json(put.clone())).error).toBe(200)
    await app.settle()
    app.slack.length = 0
    return app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })
  }

  it('clears the CEO round, says «повторно», records the clearing', async () => {
    const app = createBrandApp()
    await returnedBrief(app)
    await orderInternalOnRevision(app)
    await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    await app.settle()

    const res = await pickMadeInternalAndSubmit(app)
    expect(res.status, (await json(res.clone())).error).toBe(200)
    await app.settle()

    const row = brandRow(app.db)
    expect(row.status).toBe('submitted')
    expect(row.submit_count).toBe(2)
    expect(row.ceo_comments).toBeNull()
    expect(row.ceo_selections).toBeNull()
    expect(eventTypes(app.db).slice(-2)).toEqual(['submitted', 'resubmit_cleared_ceo'])
    const submitted = app.db.raw
      .prepare(`SELECT meta FROM brand_workflow_events WHERE event_type = 'submitted' ORDER BY rowid DESC LIMIT 1`)
      .get() as { meta: string }
    expect(JSON.parse(submitted.meta).isResubmit).toBe(true)

    expect(app.slack).toHaveLength(1)
    expect(app.slack[0].channel).toBe('C_APPROVALS')
    expect(app.slack[0].text).toContain('повторно')
  })

  it('a brief never returned is sent from in_work as new', async () => {
    const app = createBrandApp()
    insertBrand(app.db, {
      internal_naming_id: null,
      internal_feedback: INTERNAL_ORDER,
    })
    expect((await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })).status).toBe(200)
    await app.settle()

    const res = await pickMadeInternalAndSubmit(app)
    expect(res.status, (await json(res.clone())).error).toBe(200)
    await app.settle()
    expect(eventTypes(app.db)).not.toContain('resubmit_cleared_ceo')
    expect(app.slack[0].text).not.toContain('повторно')
    expect(app.slack[0].text).toContain('Новий бриф')
  })
})

d('a second round of orders starts clean', () => {
  /**
   * Round 1: a concept order; the team makes Sunburst with two names and sends
   * it; the author picks Sunburst and one name and sends to the CEO, who
   * returns it about the Internal Naming. Round 2: a new Internal Naming order.
   */
  async function twoRounds(app: BrandApp): Promise<{ concept: string; picked: string; unpicked: string }> {
    insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
    expect((await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })).status).toBe(200)
    const concept = (await json(
      await app.request('strategy', 'POST', '/api/concepts', { name: 'Sunburst', description: '', for_brand_id: 'brand_1' })
    )).data.id as string
    const name = async (n: string) =>
      (await json(
        await app.request('strategy', 'POST', '/api/namings/external', { name: n, concept_id: concept, for_brand_id: 'brand_1' })
      )).data.id as string
    const picked = await name('Sunbeam')
    const unpicked = await name('Sunray')
    expect((await app.request('strategy', 'POST', '/api/orders/brand_1/ready')).status).toBe(200)
    const put = await app.request('po', 'PUT', '/api/brands/brand_1', wizardSave({ conceptId: concept, externalNamingIds: [picked] }))
    expect(put.status, (await json(put.clone())).error).toBe(200)
    expect((await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'submitted' })).status).toBe(200)
    expect(
      (await app.request('ceo', 'PATCH', '/api/brands/brand_1/status', {
        status: 'needs_revision',
        ceoComments: { internalNaming: 'Інша назва' },
      })).status
    ).toBe(200)

    const order = await app.request(
      'po',
      'PUT',
      '/api/brands/brand_1',
      wizardSave({
        conceptId: concept,
        externalNamingIds: [picked],
        internalNamingId: null,
        stepData: { internalNaming: { selectedId: null, comment: '', newNamingFeedback: INTERNAL_ORDER } },
      })
    )
    expect(order.status, (await json(order.clone())).error).toBe(200)
    const res = await app.request('po', 'PATCH', '/api/brands/brand_1/status', { status: 'in_work' })
    expect(res.status, (await json(res.clone())).error).toBe(200)
    await app.settle()
    return { concept, picked, unpicked }
  }

  const forBrand = (app: BrandApp, table: string, id: string) =>
    (app.db.raw.prepare(`SELECT for_brand_id FROM ${table} WHERE id = ?`).get(id) as { for_brand_id: string | null })
      .for_brand_id

  it('is not «sent to the author» yet and answers under the new order message', async () => {
    const app = createBrandApp()
    await twoRounds(app)
    const row = brandRow(app.db)
    expect(row.orders_ready_at).toBeNull()
    expect(row.orders_ready_by).toBeNull()
    // the new A2's ts, not the first round's
    const a2 = app.slack.filter(m => m.channel === 'C_STRATEGY')
    expect(a2).toHaveLength(2)
    expect(row.orders_slack_ts).toBe(`17000000.${app.slack.indexOf(a2[1]) + 1}`)
  })

  it('what the first round made and the author did not keep goes back to the library', async () => {
    const app = createBrandApp()
    const { concept, picked, unpicked } = await twoRounds(app)
    expect(forBrand(app, 'external_namings', unpicked)).toBeNull()
    expect(forBrand(app, 'external_namings', picked)).toBe('brand_1')
    expect(forBrand(app, 'concepts', concept)).toBe('brand_1')
  })

  it('the order page shows only this round: the Internal Naming, nothing made for it yet', async () => {
    const app = createBrandApp()
    await twoRounds(app)
    const res = await app.request('strategy', 'GET', '/api/orders/brand_1')
    const detail = (await json(res)).data
    expect(detail.state).toBe('open')
    expect(detail.sections.map((s: { kind: string }) => s.kind)).toEqual(['internalNaming'])
    expect(detail.created.concepts).toEqual([])
    expect(detail.created.externalNamings).toEqual([])
    expect(detail.canMarkReady).toBe(false)
    expect(detail.readyBlockers).toEqual(['Створіть внутрішню назву.'])

    const list = (await json(await app.request('strategy', 'GET', '/api/orders?tab=open'))).data
    expect(list.items.map((i: { brandId: string }) => i.brandId)).toEqual(['brand_1'])
    expect(list.items[0].kinds).toEqual(['internalNaming'])
    expect(list.items[0].created).toEqual({ concepts: 0, externalNamings: 0, internalNamings: 0 })
  })

  it('«Відправити замовнику» waits for this round’s Internal Naming', async () => {
    const app = createBrandApp()
    await twoRounds(app)
    const early = await app.request('strategy', 'POST', '/api/orders/brand_1/ready')
    expect(early.status).toBe(400)
    expect((await json(early)).error).toContain('Створіть внутрішню назву.')

    const made = await app.request('strategy', 'POST', '/api/namings/internal', { name: 'Shorty', for_brand_id: 'brand_1' })
    expect(made.status, (await json(made.clone())).error).toBe(201)
    const ready = await app.request('strategy', 'POST', '/api/orders/brand_1/ready')
    expect(ready.status, (await json(ready.clone())).error).toBe(200)
    await app.settle()
    const n1 = app.slack.at(-1)!
    expect(n1.channel).toBe('C_APPROVALS')
    expect(n1.text + JSON.stringify(n1.blocks)).toContain('Shorty')
    expect(JSON.stringify(n1.blocks)).not.toContain('Sunburst')
  })

  it('a cancellation from the first round does not mark this round cancelled', async () => {
    const app = createBrandApp()
    await twoRounds(app)
    // an order_cancelled of round 1 (Internal Naming), dated before this round
    app.db.raw
      .prepare(
        `INSERT INTO brand_workflow_events (id, brand_id, event_type, user_id, created_at, meta)
         VALUES ('bwe_old', 'brand_1', 'order_cancelled', 'usr_po', '2000-01-01T00:00:00.000Z', ?)`
      )
      .run(JSON.stringify({ kind: 'internalNaming', picked: ['Int One'] }))
    const detail = (await json(await app.request('strategy', 'GET', '/api/orders/brand_1'))).data
    expect(detail.sections[0].cancelled).toBe(false)
    const list = (await json(await app.request('strategy', 'GET', '/api/orders?tab=open'))).data
    expect(list.items[0].cancelledKinds).toEqual([])
  })
})
