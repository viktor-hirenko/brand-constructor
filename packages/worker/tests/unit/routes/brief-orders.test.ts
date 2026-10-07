import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import {
  brandRow,
  CONCEPT_ORDER,
  createBrandApp,
  eventTypes,
  insertBrand,
  NAMING_ORDER,
  type BrandApp,
  type UserKey,
} from '../../helpers/brandApp'

/*
 * Orders page, «For brief», the reserve and «Готово» — brief-orders plan,
 * phase 2a, server side. A brief with an order goes `in_work`; the Strategy
 * team makes a concept / names FOR it (`for_brand_id`); nobody else may pick
 * those; «Готово» tells the author. The tests run the real routes over SQLite.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

async function json(res: Response): Promise<{ success: boolean; data?: any; error?: string }> {
  return (await res.json()) as never
}

/** A draft with a concept order, sent to the teams the way the wizard does it. */
async function briefInWork(app: BrandApp, seed: Parameters<typeof insertBrand>[1] = {}): Promise<string> {
  const id = insertBrand(app.db, {
    concept_id: null,
    external_naming_ids: [],
    new_concept_brief: CONCEPT_ORDER,
    ...seed,
  })
  const res = await app.request(seed.created_by === 'usr_po2' ? 'po2' : 'po', 'PATCH', `/api/brands/${id}/status`, {
    status: 'in_work',
  })
  expect(res.status).toBe(200)
  await app.settle()
  return id
}

async function makeConcept(app: BrandApp, brandId: string, name = 'Sunburst', user: UserKey = 'strategy') {
  const res = await app.request(user, 'POST', '/api/concepts', { name, description: '', for_brand_id: brandId })
  const body = await json(res)
  expect(res.status, body.error).toBe(201)
  return body.data.id as string
}

async function makeName(app: BrandApp, brandId: string, conceptId: string | null, name = 'Sunbeam') {
  const res = await app.request('strategy', 'POST', '/api/namings/external', {
    name,
    concept_id: conceptId,
    for_brand_id: brandId,
  })
  const body = await json(res)
  expect(res.status, body.error).toBe(201)
  return body.data.id as string
}

/** The wizard's save of a brief: the whole thing, every time. */
function wizardSave(overrides: Record<string, unknown>) {
  return {
    conceptId: null,
    externalNamingIds: [],
    internalNamingId: 'int_one',
    newConceptBrief: CONCEPT_ORDER,
    newNamingBrief: null,
    stepData: { internalNaming: { selectedId: 'int_one', comment: '', newNamingFeedback: null } },
    ...overrides,
  }
}

d('access to /api/orders', () => {
  it('is closed to Product Owner, CPO/CEO, PR and Design', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    for (const user of ['po', 'ceo', 'pr', 'design'] as const) {
      expect((await app.request(user, 'GET', '/api/orders')).status, user).toBe(403)
      expect((await app.request(user, 'GET', `/api/orders/${id}`)).status, user).toBe(403)
      expect((await app.request(user, 'POST', `/api/orders/${id}/ready`)).status, user).toBe(403)
    }
  })

  it('is open to Strategy, Admin and Head of DHC', async () => {
    const app = createBrandApp()
    await briefInWork(app)
    for (const user of ['strategy', 'admin', 'head'] as const) {
      const res = await app.request(user, 'GET', '/api/orders')
      expect(res.status, user).toBe(200)
      expect((await json(res)).data.items).toHaveLength(1)
    }
  })

  it('gives nothing about a brief that never went to the teams', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'brand_draft' })
    expect((await app.request('strategy', 'GET', '/api/orders/brand_draft')).status).toBe(404)
    expect((await json(await app.request('strategy', 'GET', '/api/orders'))).data.items).toEqual([])
  })

  it('carries what the order message carries and nothing else of the brief', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    app.db.raw
      .prepare(
        `UPDATE brands SET pr_package_comment = 'SECRET-PR', deliverables_comment = 'SECRET-DELIVERABLES',
           components_comment = 'SECRET-COMPONENTS', development_deadline = '2099-01-01',
           ceo_comments = '{"general":{"value":"SECRET-CEO","resolved":false,"resolvedAt":null}}',
           concept_comment = 'Want it warmer' WHERE id = ?`
      )
      .run(id)
    const body = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    const text = JSON.stringify(body.data)
    expect(text).not.toMatch(/SECRET|2099/)
    expect(Object.keys(body.data).sort()).toEqual(
      [
        'authorName', 'basicsComment', 'brandId', 'brandName', 'briefStatus', 'canAdd', 'canMarkReady',
        'created', 'geo', 'launchDate', 'mode', 'readyAt', 'readyBlockers', 'readyByName', 'sections',
        'selection', 'sentToWorkAt', 'state', 'submittedAt', 'approvedAt',
      ].sort()
    )
    expect(body.data.selection.conceptComment).toBe('Want it warmer')
    // the order answers, worded as in Slack
    expect(body.data.sections[0].title).toBe('Бриф нового концепту')
    expect(body.data.sections[0].answers).toContainEqual({ label: 'Що не підійшло', value: 'Not bright enough' })
    expect(body.data.sections[0].answers).toContainEqual({ label: 'Бюджет домена', value: '$100' })
  })
})

d('making for a brief («For brief»)', () => {
  it('needs the brief in work with that kind of order', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'brand_draft', new_concept_brief: CONCEPT_ORDER })
    const draft = await app.request('strategy', 'POST', '/api/concepts', { name: 'X', for_brand_id: 'brand_draft' })
    expect(draft.status).toBe(400)

    const id = await briefInWork(app)
    const internal = await app.request('strategy', 'POST', '/api/namings/internal', { name: 'I', for_brand_id: id })
    expect(internal.status).toBe(400)
    expect((await json(internal)).error).toMatch(/немає замовлення Internal Naming/)
  })

  it('puts a name for a new concept only on a concept made for the same brief', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const onLibraryConcept = await app.request('strategy', 'POST', '/api/namings/external', {
      name: 'Nope',
      concept_id: 'cpt_wonka',
      for_brand_id: id,
    })
    expect(onLibraryConcept.status).toBe(400)
    const concept = await makeConcept(app, id)
    await makeName(app, id, concept)
  })

  it('a name for a naming order goes to the brief\'s own concept', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app, { new_concept_brief: null, concept_id: 'cpt_sunrise', new_naming_brief: NAMING_ORDER })
    const other = await app.request('strategy', 'POST', '/api/namings/external', {
      name: 'Nope',
      concept_id: 'cpt_wonka',
      for_brand_id: id,
    })
    expect(other.status).toBe(400)
    await makeName(app, id, 'cpt_sunrise')
  })

  it('takes up to three names for one order — what the author can pick', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    for (const name of ['One', 'Two', 'Three']) await makeName(app, id, concept, name)
    const fourth = await app.request('strategy', 'POST', '/api/namings/external', {
      name: 'Four',
      concept_id: concept,
      for_brand_id: id,
    })
    expect(fourth.status).toBe(400)
    expect((await json(fourth)).error).toMatch(/не більше 3 назв/)
  })

  it('libraries show it with the brief it is for', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await makeConcept(app, id)
    const list = await json(await app.request('strategy', 'GET', '/api/concepts?status=all&include_reserved=1'))
    const made = list.data.find((c: { name: string }) => c.name === 'Sunburst')
    expect(made.for_brand_id).toBe(id)
    expect(made.for_brand_name).toBe('New Brand #7')
  })
})

d('«Готово»', () => {
  it('is refused until the order has something made for it, then works once', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const empty = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(empty.status).toBe(400)
    expect((await json(empty)).error).toMatch(/Створіть концепт/)

    const concept = await makeConcept(app, id)
    const noName = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(noName.status).toBe(400)
    expect((await json(noName)).error).toMatch(/Створіть назву для концепту/)

    await makeName(app, id, concept)
    const ok = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(ok.status).toBe(200)
    expect((await json(ok)).data.state).toBe('ready')
    expect(brandRow(app.db, id).orders_ready_by).toBe('usr_str')
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'orders_ready'])

    const twice = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(twice.status).toBe(409)
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'orders_ready'])
  })

  it('loses to the author picking from the library between its read and its write', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    await makeName(app, id, concept)
    // The author's save lands right before «Готово» writes: the order is gone.
    const prepare = app.db.prepare.bind(app.db)
    let interleaved = false
    app.db.prepare = (sql: string) => {
      if (!interleaved && sql.includes('SET orders_ready_at')) {
        interleaved = true
        app.db.raw
          .prepare("UPDATE brands SET new_concept_brief = NULL, concept_id = 'cpt_wonka' WHERE id = ?")
          .run(id)
      }
      return prepare(sql)
    }
    const ready = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(interleaved).toBe(true)
    expect(ready.status).toBe(409)
    expect(brandRow(app.db, id).orders_ready_at).toBeNull()
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work'])
  })

  it('freezes what was made: no deleting it afterwards', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const name = await makeName(app, id, concept)
    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    expect((await app.request('strategy', 'DELETE', `/api/namings/external/${name}`)).status).toBe(409)
    expect((await app.request('strategy', 'DELETE', `/api/concepts/${concept}`)).status).toBe(409)
    expect((await app.request('strategy', 'PUT', `/api/concepts/${concept}`, { for_brand_id: null })).status).toBe(409)
    // and nothing new is added to it
    const more = await app.request('strategy', 'POST', '/api/concepts', { name: 'Late', for_brand_id: id })
    expect(more.status).toBe(400)
    expect((await json(more)).error).toMatch(/вже відправлено замовнику/)
    const detail = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    expect(detail.data.canAdd).toEqual({ concept: false, externalNaming: false, internalNaming: false })
  })

  it('moves the order between Open, Ready and Archive', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const tabs = async () => (await json(await app.request('strategy', 'GET', '/api/orders'))).data.counts
    expect(await tabs()).toEqual({ open: 1, ready: 0, archive: 0 })
    const concept = await makeConcept(app, id)
    await makeName(app, id, concept)
    await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(await tabs()).toEqual({ open: 0, ready: 1, archive: 0 })
    const ready = await json(await app.request('strategy', 'GET', '/api/orders?tab=ready'))
    expect(ready.data.items[0]).toMatchObject({ brandId: id, kinds: ['concept'], created: { concepts: 1, externalNamings: 1 } })
    // The table names what was made, not only how many (owner, 07.10).
    expect(ready.data.items[0].createdNames.concepts).toHaveLength(1)
    expect(ready.data.items[0].createdNames.externalNamings).toHaveLength(1)
    expect(ready.data.items[0].createdNames.internalNamings).toEqual([])
    for (const name of [...ready.data.items[0].createdNames.concepts, ...ready.data.items[0].createdNames.externalNamings]) {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    }
  })
})

d('the reserve', () => {
  it('another brief may not pick what was made for this one (PUT 400)', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    insertBrand(app.db, { id: 'brand_other', created_by: 'usr_po2' })
    const res = await app.request('po2', 'PUT', '/api/brands/brand_other', wizardSave({ conceptId: concept, newConceptBrief: null }))
    expect(res.status).toBe(400)
    expect((await json(res)).error).toMatch(/створено на замовлення іншого брифу/)
    expect(brandRow(app.db, 'brand_other').concept_id).toBe('cpt_sunrise')
  })

  it('is hidden from another brief in the wizard, shown to its own brief and in the Admin', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    await makeConcept(app, id)
    const names = async (q: string) =>
      (await json(await app.request('po2', 'GET', `/api/concepts?${q}`))).data.map((c: { name: string }) => c.name)
    expect(await names('available_for_brand=brand_other')).not.toContain('Sunburst')
    expect(await names('status=all')).not.toContain('Sunburst')
    expect(await names(`available_for_brand=${id}`)).toContain('Sunburst')
    expect(await names('status=all&include_reserved=1')).toContain('Sunburst')
  })

  it('the CEO may not offer it to another brief either', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    insertBrand(app.db, { id: 'brand_other', created_by: 'usr_po2', status: 'submitted' })
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_other/ceo-selections', {
      ceoSelections: { concept },
    })
    expect(res.status).toBe(400)
  })

  it('approving what another brand already uses is refused with 409 (H-09)', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'brand_other', status: 'submitted' })
    app.db.raw
      .prepare("UPDATE concepts SET used_in_brand_id = 'brand_x', status = 'used' WHERE id = 'cpt_sunrise'")
      .run()
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_other/status', { status: 'approved' })
    expect(res.status).toBe(409)
    expect(brandRow(app.db, 'brand_other').status).toBe('submitted')
    const row = app.db.raw.prepare("SELECT used_in_brand_id FROM concepts WHERE id = 'cpt_sunrise'").get() as {
      used_in_brand_id: string
    }
    expect(row.used_in_brand_id).toBe('brand_x')
  })

  it('approval taken over between the check and the write changes nothing (H-09)', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'brand_other', status: 'submitted' })
    // Another approval takes Sunrise right before this one's batch runs.
    const batch = app.db.batch.bind(app.db)
    app.db.batch = async statements => {
      app.db.raw
        .prepare("UPDATE concepts SET used_in_brand_id = 'brand_x', status = 'used' WHERE id = 'cpt_sunrise'")
        .run()
      return batch(statements)
    }
    const res = await app.request('ceo', 'PATCH', '/api/brands/brand_other/status', { status: 'approved' })
    expect(res.status).toBe(409)
    expect((await json(res)).error).toMatch(/Sunrise/)
    expect(brandRow(app.db, 'brand_other').status).toBe('submitted')
    const marks = app.db.raw
      .prepare("SELECT used_in_brand_id FROM external_namings WHERE id = 'ext_bubbleton'")
      .get() as { used_in_brand_id: string | null }
    expect(marks.used_in_brand_id).toBeNull()
  })

  it('picking what the team made closes the order without cancelling it', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const name = await makeName(app, id, concept)
    const res = await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: concept, externalNamingIds: [name], newConceptBrief: null }))
    expect(res.status).toBe(200)
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work'])
    const row = app.db.raw.prepare('SELECT for_brand_id FROM concepts WHERE id = ?').get(concept) as { for_brand_id: string }
    expect(row.for_brand_id).toBe(id)
    // nothing left to do, nothing was cancelled, and the order is still readable
    const detail = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    expect(detail.data.state).toBe('closed')
    expect(detail.data.sections[0]).toMatchObject({ open: false, cancelled: false, fromSnapshot: true })
    expect(detail.data.sections[0].answers).toContainEqual({ label: 'Що не підійшло', value: 'Not bright enough' })
    // and the page marks what the author picked
    expect(detail.data.created.concepts[0]).toMatchObject({ id: concept, usedInBrand: true })
    expect(detail.data.created.externalNamings[0]).toMatchObject({ id: name, usedInBrand: true })
  })

  it('picking from the library instead cancels the order and frees what was made', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const name = await makeName(app, id, concept)
    const res = await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: 'cpt_wonka', externalNamingIds: ['ext_wonkaland'], newConceptBrief: null }))
    expect(res.status).toBe(200)
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'order_cancelled'])
    const meta = app.db.raw
      .prepare("SELECT meta FROM brand_workflow_events WHERE event_type = 'order_cancelled'")
      .get() as { meta: string }
    expect(JSON.parse(meta.meta)).toEqual({ kind: 'concept', picked: ['Wonka'] })
    const freed = (table: string, rowId: string) =>
      (app.db.raw.prepare(`SELECT for_brand_id FROM ${table} WHERE id = ?`).get(rowId) as { for_brand_id: string | null }).for_brand_id
    expect(freed('concepts', concept)).toBeNull()
    expect(freed('external_namings', name)).toBeNull()
    const detail = await json(await app.request('strategy', 'GET', `/api/orders/${id}`))
    expect(detail.data.state).toBe('cancelled')
    expect(detail.data.sections[0]).toMatchObject({ kind: 'concept', open: false, cancelled: true, fromSnapshot: true })
    const archive = await json(await app.request('strategy', 'GET', '/api/orders?tab=archive'))
    expect(archive.data.items[0]).toMatchObject({ state: 'cancelled', cancelledKinds: ['concept'] })
  })

  it('a brief moved by migration 013 (no order list on its event) still says what was ordered', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const name = await makeName(app, id, concept)
    // 013 renamed the old `submitted` event: its meta has no `orders`.
    app.db.raw.prepare("UPDATE brand_workflow_events SET meta = '{}' WHERE event_type = 'sent_to_work'").run()
    await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: concept, externalNamingIds: [name], newConceptBrief: null }))
    await app.request('po', 'PATCH', `/api/brands/${id}/status`, { status: 'submitted' })
    const archive = await json(await app.request('strategy', 'GET', '/api/orders?tab=archive'))
    expect(archive.data.items[0]).toMatchObject({
      brandId: id,
      kinds: ['concept'],
      openKinds: [],
      cancelledKinds: [],
      state: 'closed',
    })
  })

  it('approval frees what the brief did not pick and keeps what it did as used', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const spare = await makeConcept(app, id, 'Spare')
    const name = await makeName(app, id, concept)
    await app.request('po', 'PUT', `/api/brands/${id}`, wizardSave({ conceptId: concept, externalNamingIds: [name], newConceptBrief: null }))
    expect((await app.request('po', 'PATCH', `/api/brands/${id}/status`, { status: 'submitted' })).status).toBe(200)
    expect((await app.request('ceo', 'PATCH', `/api/brands/${id}/status`, { status: 'approved' })).status).toBe(200)
    const row = (rowId: string) =>
      app.db.raw.prepare('SELECT for_brand_id, used_in_brand_id FROM concepts WHERE id = ?').get(rowId)
    expect(row(concept)).toEqual({ for_brand_id: id, used_in_brand_id: id })
    expect(row(spare)).toEqual({ for_brand_id: null, used_in_brand_id: null })
  })

  it('deleting the brief frees what was made, in the same batch', async () => {
    const app = createBrandApp()
    const id = await briefInWork(app)
    const concept = await makeConcept(app, id)
    const name = await makeName(app, id, concept)
    expect((await app.request('admin', 'DELETE', `/api/brands/${id}`)).status).toBe(200)
    expect(app.db.raw.prepare('SELECT for_brand_id FROM concepts WHERE id = ?').get(concept)).toEqual({ for_brand_id: null })
    expect(app.db.raw.prepare('SELECT for_brand_id FROM external_namings WHERE id = ?').get(name)).toEqual({ for_brand_id: null })
  })
})
