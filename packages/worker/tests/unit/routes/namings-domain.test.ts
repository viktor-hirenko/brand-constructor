import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import namings from '../../../src/routes/namings'
import { batchCheckDomains } from '../../../src/utils/domain-check'
import { USERS, seedLibrary, type UserKey } from '../../helpers/brandApp'
import { SCHEMA_SQL, createTestD1, hasNodeSqlite, readMigration, type TestD1 } from '../../helpers/sqliteD1'

/**
 * Domain status and purchase price (docs/architecture/domain-status-plan.md).
 * Sofia's resold domains were all «Available, $15»: the registrar's
 * registration price was written for taken domains too, and the only way to
 * show a resold one was a manual «Available» with the real price in the
 * tagline. Now a taken domain has no registration price, «For sale» is the one
 * manual status and carries its own price, and leaving it rechecks at once.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

interface Registrar {
  /** domain → answer; a domain missing here makes the registrar fail. */
  answers: Map<string, { available: boolean; register: number }>
  calls: string[]
}

function createNamingsApp(options: { pananames?: boolean } = {}) {
  const db = createTestD1()
  seedLibrary(db)
  const registrar: Registrar = { answers: new Map(), calls: [] }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const m = /\/domains\/([^/]+)\/check$/.exec(String(url))
      if (!m) throw new Error(`unexpected fetch in test: ${url}`)
      const domain = decodeURIComponent(m[1])
      registrar.calls.push(domain)
      const answer = registrar.answers.get(domain)
      if (!answer) return new Response('boom', { status: 500 })
      const prices = { currency: 'USD', register: answer.register, renew: 15, transfer: 15, redeem: 80 }
      return new Response(
        JSON.stringify({
          data: {
            domain,
            domain_idn: domain,
            available: answer.available,
            premium: false,
            prices,
            promo_prices: null,
            claim: false,
            add_req: false,
          },
        })
      )
    })
  )

  const app = new Hono()
  app.use('*', async (c, next) => {
    const key = (c.req.header('x-test-user') ?? 'admin') as UserKey
    c.set('user' as never, USERS[key] as never)
    await next()
  })
  app.route('/api/namings', namings as never)
  const env = { DB: db, PANANAMES_SIGNATURE: options.pananames === false ? '' : 'sig' }

  return {
    db,
    env,
    registrar,
    request(method: string, path: string, body?: unknown, user: UserKey = 'admin') {
      return app.request(
        path,
        {
          method,
          headers: { 'content-type': 'application/json', 'x-test-user': user },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        env
      )
    },
  }
}

type NamingsApp = ReturnType<typeof createNamingsApp>

function row(app: NamingsApp, id: string) {
  return app.db.raw
    .prepare(
      'SELECT availability_status, domain_check_source, price, purchase_price, tagline FROM external_namings WHERE id = ?'
    )
    .get(id) as {
    availability_status: string
    domain_check_source: string
    price: number | null
    purchase_price: number | null
    tagline: string
  }
}

/** The 06.10 production state: a resold domain marked «Available» by hand. */
function insertOverride(db: TestD1, id: string, domain: string, status = 'available') {
  db.raw
    .prepare(
      `INSERT INTO external_namings (id, name, domain, price, availability_status, domain_check_source, created_by)
       VALUES (?, ?, ?, 15, ?, 'admin_override', 'usr_admin')`
    )
    .run(id, domain.split('.')[0], domain, status)
}

function insertAuto(db: TestD1, id: string, domain: string, status: string, price: number | null) {
  db.raw
    .prepare(
      `INSERT INTO external_namings (id, name, domain, price, availability_status, domain_check_source, created_by)
       VALUES (?, ?, ?, ?, ?, 'pananames', 'usr_admin')`
    )
    .run(id, domain.split('.')[0], domain, price, status)
}

d('a taken domain has no registration price', () => {
  it('the registrar says taken: status Sold and the old $15 is cleared', async () => {
    const app = createNamingsApp()
    insertAuto(app.db, 'exn_gold', 'goldville.com', 'available', 15)
    app.registrar.answers.set('goldville.com', { available: false, register: 15 })

    await batchCheckDomains(app.env as never)

    expect(row(app, 'exn_gold')).toMatchObject({ availability_status: 'sold', price: null })
  })

  it('the registrar says free: status Available with its registration price', async () => {
    const app = createNamingsApp()
    insertAuto(app.db, 'exn_joy', 'joymus.com', 'unknown', null)
    app.registrar.answers.set('joymus.com', { available: true, register: 15 })

    await batchCheckDomains(app.env as never)

    expect(row(app, 'exn_joy')).toMatchObject({ availability_status: 'available', price: 15 })
  })

  it('the admin preview of a taken domain shows no registration price', async () => {
    const app = createNamingsApp()
    app.registrar.answers.set('chamboo.com', { available: false, register: 15 })
    const res = await app.request('POST', '/api/namings/external/preview-domain', { domain: 'chamboo.com' })
    const body = (await res.json()) as { data: { available: boolean; price: number | null } }
    expect(body.data).toMatchObject({ available: false, price: null })
  })
})

d('«For sale» is set by the team, with a purchase price', () => {
  it('edit: For sale with a price → stored as a manual status, registration price gone', async () => {
    const app = createNamingsApp()
    insertOverride(app.db, 'exn_chamboo', 'chamboo.com')

    const res = await app.request('PUT', '/api/namings/external/exn_chamboo', {
      availability_status: 'for_sale',
      purchase_price: 2685,
    })

    expect(res.status).toBe(200)
    expect(row(app, 'exn_chamboo')).toMatchObject({
      availability_status: 'for_sale',
      domain_check_source: 'admin_override',
      price: null,
      purchase_price: 2685,
    })
    expect(app.registrar.calls).toEqual([])
  })

  it('For sale without a price is refused and nothing changes', async () => {
    const app = createNamingsApp()
    insertOverride(app.db, 'exn_chamboo', 'chamboo.com')

    const res = await app.request('PUT', '/api/namings/external/exn_chamboo', {
      availability_status: 'for_sale',
      purchase_price: null,
    })

    expect(res.status).toBe(400)
    expect(row(app, 'exn_chamboo')).toMatchObject({ availability_status: 'available', price: 15 })
  })

  it('create: For sale with a price, the registrar is not asked', async () => {
    const app = createNamingsApp()
    const res = await app.request('POST', '/api/namings/external', {
      name: 'Cashdisco',
      domain: 'cashdisco.com',
      availability_status: 'for_sale',
      purchase_price: 7888,
    })
    const { data } = (await res.json()) as { data: { id: string } }

    expect(res.status).toBe(201)
    expect(row(app, data.id)).toMatchObject({
      availability_status: 'for_sale',
      domain_check_source: 'admin_override',
      purchase_price: 7888,
    })
    expect(app.registrar.calls).toEqual([])
  })

  it('a manual Available / Sold can no longer be set', async () => {
    const app = createNamingsApp()
    insertAuto(app.db, 'exn_joy', 'joymus.com', 'sold', null)

    const asAvailable = await app.request('PUT', '/api/namings/external/exn_joy', {
      availability_status: 'available',
      domain_check_source: 'admin_override',
    })
    const bareOverride = await app.request('PUT', '/api/namings/external/exn_joy', {
      domain_check_source: 'admin_override',
    })

    expect(asAvailable.status).toBe(400)
    expect(bareOverride.status).toBe(400)
    expect(row(app, 'exn_joy')).toMatchObject({ availability_status: 'sold', domain_check_source: 'pananames' })
  })

  it('the nightly check and the recheck button leave a For sale row alone', async () => {
    const app = createNamingsApp()
    insertOverride(app.db, 'exn_cash', 'cashdisco.com', 'for_sale')
    app.db.raw.prepare('UPDATE external_namings SET price = NULL, purchase_price = 7888 WHERE id = ?').run('exn_cash')
    app.registrar.answers.set('cashdisco.com', { available: true, register: 15 })

    await batchCheckDomains(app.env as never)
    await app.request('POST', '/api/namings/external/exn_cash/check-domain', {})

    expect(row(app, 'exn_cash')).toMatchObject({ availability_status: 'for_sale', purchase_price: 7888, price: null })
    expect(app.registrar.calls).toEqual([])
  })

  it('a role without library access cannot set it', async () => {
    const app = createNamingsApp()
    insertOverride(app.db, 'exn_chamboo', 'chamboo.com')
    const res = await app.request(
      'PUT',
      '/api/namings/external/exn_chamboo',
      { availability_status: 'for_sale', purchase_price: 1 },
      'po'
    )
    expect(res.status).toBe(403)
  })
})

d('back to Automatic rechecks the domain at once', () => {
  it('the registrar answers: its status is saved immediately', async () => {
    const app = createNamingsApp()
    insertOverride(app.db, 'exn_chamboo', 'chamboo.com', 'for_sale')
    app.registrar.answers.set('chamboo.com', { available: false, register: 15 })

    const res = await app.request('PUT', '/api/namings/external/exn_chamboo', { domain_check_source: 'manual' })

    expect(res.status).toBe(200)
    expect(app.registrar.calls).toEqual(['chamboo.com'])
    expect(row(app, 'exn_chamboo')).toMatchObject({
      availability_status: 'sold',
      domain_check_source: 'pananames',
      price: null,
    })
  })

  it('the registrar is down or not configured: Unknown, left to the nightly check', async () => {
    const down = createNamingsApp()
    insertOverride(down.db, 'exn_chamboo', 'chamboo.com', 'for_sale')
    await down.request('PUT', '/api/namings/external/exn_chamboo', { domain_check_source: 'manual' })
    expect(row(down, 'exn_chamboo')).toMatchObject({ availability_status: 'unknown', domain_check_source: 'manual' })

    const stage = createNamingsApp({ pananames: false })
    insertOverride(stage.db, 'exn_chamboo', 'chamboo.com', 'for_sale')
    await stage.request('PUT', '/api/namings/external/exn_chamboo', { domain_check_source: 'manual' })
    expect(row(stage, 'exn_chamboo')).toMatchObject({ availability_status: 'unknown', domain_check_source: 'manual' })
    expect(stage.registrar.calls).toEqual([])
  })

  it('a save that does not touch the status does not ask the registrar', async () => {
    const app = createNamingsApp()
    insertAuto(app.db, 'exn_joy', 'joymus.com', 'available', 15)
    await app.request('PUT', '/api/namings/external/exn_joy', { name: 'Joymus', domain_check_source: 'manual' })
    expect(app.registrar.calls).toEqual([])
    expect(row(app, 'exn_joy')).toMatchObject({ availability_status: 'available', domain_check_source: 'pananames' })
  })
})

d('the admin table gets every naming', () => {
  it('per_page 500 returns all 160 rows the stage had, not the newest 100', async () => {
    const app = createNamingsApp()
    const ins = app.db.raw.prepare('INSERT INTO external_namings (id, name, created_by) VALUES (?, ?, ?)')
    for (let i = 0; i < 156; i++) ins.run(`exn_bulk_${i}`, `Bulk ${i}`, 'usr_admin')
    const res = await app.request('GET', '/api/namings/external?status=all&per_page=500')
    const body = (await res.json()) as { data: unknown[]; total: number }
    expect(body.total).toBe(160)
    expect(body.data).toHaveLength(160)
  })
})

d('migration 015', () => {
  it('adds purchase_price to a base that has none', () => {
    const before = SCHEMA_SQL.replace(/\s*purchase_price REAL,/, '')
    expect(before).not.toContain('purchase_price')
    const db = createTestD1(before)
    db.raw.exec(readMigration('015_naming_purchase_price.sql'))
    const cols = (db.raw.prepare('PRAGMA table_info(external_namings)').all() as { name: string }[]).map(c => c.name)
    expect(cols).toContain('purchase_price')
  })
})
