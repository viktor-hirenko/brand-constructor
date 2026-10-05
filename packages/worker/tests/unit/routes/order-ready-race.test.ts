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

/*
 * «Замовник обрав з бібліотеки» × «Відправити замовнику» in the same second
 * (H-31, run 02.10: D-65). Both used to pass: `orders_ready`, then
 * `order_cancelled` 40 ms later — the team's screen said «Відправлено
 * замовнику» for an order already off the brief, and Slack would have told the
 * author «готово» about it. Now one wins and the other hears why. Real routes
 * over the real schema in SQLite: the conditional UPDATEs decide the race.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

const ORDER_SENT_RELOAD = 'Замовлення вже відправлено замовнику — оновіть сторінку.'
const PICKED_FROM_LIBRARY = 'Замовник уже обрав з бібліотеки — замовлення скасовано.'

async function json(res: Response): Promise<{ success: boolean; data?: any; error?: string }> {
  return (await res.json()) as never
}

/**
 * A brief in work with a concept order, the concept and a name made for it —
 * ready to be sent to the author. Its version is set back an hour, so the
 * stamps the requests write never collide with it within one millisecond.
 */
async function orderReadyToSend(app: BrandApp): Promise<string> {
  const id = insertBrand(app.db, { concept_id: null, external_naming_ids: [], new_concept_brief: CONCEPT_ORDER })
  expect((await app.request('po', 'PATCH', `/api/brands/${id}/status`, { status: 'in_work' })).status).toBe(200)
  const concept = await json(
    await app.request('strategy', 'POST', '/api/concepts', { name: 'Sunburst', description: '', for_brand_id: id })
  )
  await app.request('strategy', 'POST', '/api/namings/external', {
    name: 'Sunbeam',
    concept_id: concept.data.id,
    for_brand_id: id,
  })
  app.db.raw.prepare("UPDATE brands SET updated_at = '2026-10-05T08:00:00.000Z' WHERE id = ?").run(id)
  await app.settle()
  app.slack.length = 0
  return id
}

/** The version the author's tab works on top of, as the wizard reads it. */
async function tabVersion(app: BrandApp, id: string): Promise<string> {
  return (await json(await app.request('po', 'GET', `/api/brands/${id}`))).data.updatedAt
}

/** The author's «Зберегти» with library Wonka instead of the ordered concept. */
function libraryPick(expectedUpdatedAt?: string) {
  return {
    conceptId: 'cpt_wonka',
    externalNamingIds: ['ext_wonkaland'],
    internalNamingId: 'int_one',
    newConceptBrief: null,
    newNamingBrief: null,
    stepData: { internalNaming: { selectedId: 'int_one', comment: '', newNamingFeedback: null } },
    expectedUpdatedAt,
  }
}

/** Runs `sql` straight in the table the moment the route prepares a statement matching `when`. */
function landBefore(app: BrandApp, when: (sql: string) => boolean, sql: string, ...args: unknown[]) {
  const prepare = app.db.prepare.bind(app.db)
  const state = { landed: false }
  app.db.prepare = (statement: string) => {
    if (!state.landed && when(statement)) {
      state.landed = true
      app.db.raw.prepare(sql).run(...args)
    }
    return prepare(statement)
  }
  return state
}

function orderStillSent(app: BrandApp, id: string) {
  const row = brandRow(app.db, id)
  expect(row.orders_ready_at).not.toBeNull()
  expect(row.new_concept_brief).not.toBeNull()
  expect(row.concept_id).toBeNull()
  expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'orders_ready'])
}

d('the team sends first — the author\'s library pick is refused (H-31, D-65)', () => {
  it('a tab opened before «Відправити замовнику» hears the order was sent and nothing is cancelled', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    const tab = await tabVersion(app, id)

    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    await app.settle()
    const pick = await app.request('po', 'PUT', `/api/brands/${id}`, libraryPick(tab))
    expect(pick.status).toBe(409)
    expect((await json(pick)).error).toBe(ORDER_SENT_RELOAD)

    await app.settle()
    orderStillSent(app, id)
    expect(app.slack.map(m => m.channel)).not.toContain('C_STRATEGY')
  })

  it('«Відправити замовнику» landing between the save\'s read and write is not overwritten', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    const tab = await tabVersion(app, id)
    const stamp = '2026-10-05T09:00:00.000Z'
    const race = landBefore(
      app,
      sql => sql.startsWith('UPDATE brands SET') && sql.includes('WHERE id = ? AND status = ?'),
      "UPDATE brands SET orders_ready_at = ?, orders_ready_by = 'usr_str', updated_at = ? WHERE id = ?",
      stamp,
      stamp,
      id
    )

    const pick = await app.request('po', 'PUT', `/api/brands/${id}`, libraryPick(tab))
    expect(race.landed).toBe(true)
    expect(pick.status).toBe(409)
    expect((await json(pick)).error).toBe(ORDER_SENT_RELOAD)
    const row = brandRow(app.db, id)
    expect(row.new_concept_brief).not.toBeNull()
    expect(eventTypes(app.db, id)).not.toContain('order_cancelled')
  })

  it('so is a tab on an older wizard build that sends no version', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    const stamp = '2026-10-05T09:00:00.000Z'
    landBefore(
      app,
      sql => sql.startsWith('UPDATE brands SET') && sql.includes('WHERE id = ? AND status = ?'),
      "UPDATE brands SET orders_ready_at = ?, orders_ready_by = 'usr_str', updated_at = ? WHERE id = ?",
      stamp,
      stamp,
      id
    )

    const pick = await app.request('po', 'PUT', `/api/brands/${id}`, libraryPick())
    expect(pick.status).toBe(409)
    expect((await json(pick)).error).toBe(ORDER_SENT_RELOAD)
    expect(eventTypes(app.db, id)).not.toContain('order_cancelled')
  })

  it('after a reload the author may still pick from the library: the sent order is cancelled', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    expect((await app.request('strategy', 'POST', `/api/orders/${id}/ready`)).status).toBe(200)
    const reloaded = await tabVersion(app, id)

    const pick = await app.request('po', 'PUT', `/api/brands/${id}`, libraryPick(reloaded))
    expect(pick.status).toBe(200)
    expect(brandRow(app.db, id).concept_id).toBe('cpt_wonka')
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'orders_ready', 'order_cancelled'])
  })
})

d('the author picks first — «Відправити замовнику» is refused (H-31, D-65)', () => {
  it('after the pick: «Замовник уже обрав з бібліотеки»', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    expect((await app.request('po', 'PUT', `/api/brands/${id}`, libraryPick(await tabVersion(app, id)))).status).toBe(200)

    const ready = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect((await json(ready)).error).toBe(PICKED_FROM_LIBRARY)
    expect(brandRow(app.db, id).orders_ready_at).toBeNull()
    expect(eventTypes(app.db, id)).toEqual(['sent_to_work', 'order_cancelled'])
  })

  it('the pick landing between its read and its write: the same words, not just «reload»', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    const race = landBefore(
      app,
      sql => sql.includes('SET orders_ready_at'),
      "UPDATE brands SET new_concept_brief = NULL, concept_id = 'cpt_wonka' WHERE id = ?",
      id
    )

    const ready = await app.request('strategy', 'POST', `/api/orders/${id}/ready`)
    expect(race.landed).toBe(true)
    expect(ready.status).toBe(409)
    expect((await json(ready)).error).toBe(PICKED_FROM_LIBRARY)
    expect(brandRow(app.db, id).orders_ready_at).toBeNull()
    expect(eventTypes(app.db, id)).not.toContain('orders_ready')
  })
})

d('both at the same moment (H-31, D-65)', () => {
  it('exactly one goes through; the other is refused with its reason', async () => {
    const app = createBrandApp()
    const id = await orderReadyToSend(app)
    const tab = await tabVersion(app, id)

    const [ready, pick] = await Promise.all([
      app.request('strategy', 'POST', `/api/orders/${id}/ready`),
      app.request('po', 'PUT', `/api/brands/${id}`, libraryPick(tab)),
    ])
    await app.settle()

    expect([ready.status, pick.status].filter(s => s === 200)).toHaveLength(1)
    const events = eventTypes(app.db, id)
    expect(events.includes('orders_ready') && events.includes('order_cancelled')).toBe(false)
    const loser = ready.status === 200 ? pick : ready
    expect([ORDER_SENT_RELOAD, PICKED_FROM_LIBRARY]).toContain((await json(loser)).error)
  })
})
