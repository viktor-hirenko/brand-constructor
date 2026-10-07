import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../../../src/index'
import namings from '../../../src/routes/namings'
import { batchCheckDomains } from '../../../src/utils/domain-check'
import {
  DISCOVERY_MAX_DOMAINS,
  PRICE_CHECK_CRON,
  PRICE_CHECK_MAX_DOMAINS,
  PRICE_DISCOVERY_CRON,
  runPriceCheck,
  runPriceDiscovery,
} from '../../../src/utils/price-check'
import { PRICE_CHECK_USER_AGENT } from '../../../src/utils/price-sources'
import { USERS, seedLibrary, type UserKey } from '../../helpers/brandApp'
import { createMarketplaces } from '../../helpers/marketplaces'
import { SCHEMA_SQL, createTestD1, hasNodeSqlite, readMigration } from '../../helpers/sqliteD1'

/**
 * The nightly price check of «For sale» domains against the database and the
 * admin's routes (docs/architecture/domain-price-sync-plan.md). The rules
 * themselves are in `price-check-rules.test.ts`; here — that the run asks the
 * marketplaces the way the plan promises, writes only what the rules decided,
 * and that a person's save and a person's decision do what the table shows.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** 06:30 UTC of the n-th night. */
const night = (n: number) => new Date(Date.UTC(2026, 9, 7 + n, 6, 30))

function createApp(options: { enabled?: boolean; pananames?: boolean } = {}) {
  const db = createTestD1()
  seedLibrary(db)
  const market = createMarketplaces()
  vi.stubGlobal('fetch', vi.fn(market.fetch))

  const app = new Hono()
  app.use('*', async (c, next) => {
    const key = (c.req.header('x-test-user') ?? 'admin') as UserKey
    c.set('user' as never, USERS[key] as never)
    await next()
  })
  app.route('/api/namings', namings as never)
  const env = {
    DB: db,
    PANANAMES_SIGNATURE: options.pananames ? 'sig' : '',
    PRICE_CHECK_ENABLED: options.enabled === false ? undefined : 'true',
  }
  const pauses: number[] = []

  return {
    db,
    env,
    market,
    pauses,
    /** The 06:45 run over taken domains. */
    discover(n: number) {
      return runPriceDiscovery(env as never, {
        fetch: market.fetch,
        sleep: async ms => void pauses.push(ms),
        now: () => night(n),
      })
    },
    /** A taken domain nobody marked; `unknown` is what the stage has instead of Sold. */
    taken(id: string, domain: string, status = 'sold', source = 'pananames') {
      db.raw
        .prepare(
          `INSERT INTO external_namings (id, name, domain, availability_status, domain_check_source, created_by)
           VALUES (?, ?, ?, ?, ?, 'usr_admin')`
        )
        .run(id, domain.split('.')[0], domain, status, source)
    },
    /** The nightly run, as the schedule starts it. */
    run(n: number) {
      return runPriceCheck(env as never, {
        fetch: market.fetch,
        sleep: async ms => void pauses.push(ms),
        now: () => night(n),
      })
    },
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
    forSale(id: string, domain: string, price: number, status = 'active') {
      db.raw
        .prepare(
          `INSERT INTO external_namings (id, name, domain, purchase_price, availability_status, domain_check_source, status, created_by)
           VALUES (?, ?, ?, ?, 'for_sale', 'admin_override', ?, 'usr_admin')`
        )
        .run(id, domain.split('.')[0], domain, price, status)
    },
    row(id: string) {
      return db.raw.prepare('SELECT * FROM external_namings WHERE id = ?').get(id) as Record<string, unknown>
    },
    readings(id: string) {
      return db.raw
        .prepare('SELECT source, outcome, amount, pending_amount FROM naming_price_checks WHERE naming_id = ? ORDER BY source')
        .all(id) as { source: string; outcome: string; amount: number | null; pending_amount: number | null }[]
    },
    async rowFromList(id: string) {
      const res = await app.request('/api/namings/external?status=all&per_page=500', { headers: { 'x-test-user': 'admin' } }, env)
      const body = (await res.json()) as {
        data: { id: string; price_auto: boolean; price_check: Record<string, unknown> | null }[]
      }
      return body.data.find(n => n.id === id)!
    },
    async line(id: string) {
      return (await this.rowFromList(id))?.price_check ?? null
    },
  }
}

d('the nightly run', () => {
  it('the first night: every price is matched to its marketplace and nothing is changed', async () => {
    const app = createApp()
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    app.forSale('exn_chamboo', 'chamboo.com', 2685)
    app.forSale('exn_boomico', 'boomico.com', 3300)
    app.market.listings.set('cashdisco.com', { afternic: 7888, sedo: 'offers', namecheap: 7888 })
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })
    app.market.listings.set('boomico.com', { afternic: 'lander', sedo: 3315, namecheap: 3300 })

    const summary = await app.run(0)

    expect(summary).toMatchObject({ namings: 3, domains: 3, updated: 0, delisted: 0, refused: [] })
    expect(app.row('exn_cash')).toMatchObject({ purchase_price: 7888, price_source: 'afternic', availability_status: 'for_sale' })
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2685, price_source: 'namecheap' })
    expect(app.row('exn_boomico')).toMatchObject({ purchase_price: 3300, price_source: 'namecheap' })
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'verified', source: 'namecheap', date: night(0).toISOString() })
    expect(app.readings('exn_cash')).toEqual([
      { source: 'afternic', outcome: 'listed', amount: 7888, pending_amount: null },
      { source: 'namecheap', outcome: 'listed', amount: 7888, pending_amount: null },
      { source: 'sedo', outcome: 'no_fixed_price', amount: null, pending_amount: null },
    ])
  })

  it('one request to Namecheap for all, one to Afternic and Sedo per domain, a pause between domains, the server’s name on each', async () => {
    const app = createApp()
    app.forSale('exn_a', 'chamboo.com', 2685)
    app.forSale('exn_b', 'Chamboo.com', 2685)
    app.forSale('exn_c', 'darkmont.com', 2795)

    await app.run(0)

    expect(app.market.asked('namecheap')).toEqual(['chamboo.com,darkmont.com'])
    expect(app.market.asked('afternic').sort()).toEqual(['chamboo.com', 'darkmont.com'])
    expect(app.market.asked('sedo').sort()).toEqual(['chamboo.com', 'darkmont.com'])
    expect(app.pauses).toEqual([1000])
    for (const call of app.market.calls) expect(call.userAgent).toBe(PRICE_CHECK_USER_AGENT)
    expect(app.readings('exn_b')).toHaveLength(3)
  })

  it('rows that are not «For sale» are not asked about', async () => {
    const app = createApp()
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    app.db.raw
      .prepare(
        `INSERT INTO external_namings (id, name, domain, price, availability_status, domain_check_source, created_by)
         VALUES ('exn_auto', 'joymus', 'joymus.com', 15, 'available', 'pananames', 'usr_admin'),
                ('exn_old', 'oldie', 'oldie.com', 15, 'available', 'admin_override', 'usr_admin')`
      )
      .run()
    app.db.raw.prepare(`UPDATE external_namings SET status = 'archived' WHERE id = 'ext_free'`).run()

    await app.run(0)

    expect(app.market.calls.flatMap(c => c.domains)).toEqual(['cashdisco.com', 'cashdisco.com', 'cashdisco.com'])
    expect(app.readings('exn_auto')).toEqual([])
  })

  it('a 403 stops the requests to that marketplace for the run and changes nothing', async () => {
    const app = createApp()
    for (const [i, domain] of ['a.com', 'b.com', 'c.com', 'd.com'].entries()) {
      app.forSale(`exn_${i}`, domain, 1000 + i)
      app.market.listings.set(domain, { afternic: 1000 + i, sedo: 1000 + i, namecheap: 990 + i })
    }
    await app.run(0)
    const before = [0, 1, 2, 3].map(i => app.row(`exn_${i}`))
    app.market.calls.length = 0
    app.market.refusing.add('afternic')
    for (const domain of ['a.com', 'b.com', 'c.com', 'd.com']) app.market.listings.delete(domain)

    let summary = await app.run(1)

    expect(app.market.asked('afternic')).toHaveLength(1)
    expect(app.market.asked('sedo')).toHaveLength(4)
    expect(summary).toMatchObject({ refused: ['afternic'], unread: { afternic: 4, sedo: 0, namecheap: 0 } })
    for (let n = 2; n < 6; n++) summary = await app.run(n)
    expect([0, 1, 2, 3].map(i => app.row(`exn_${i}`))).toEqual(before)
    expect(summary.delisted).toBe(0)
    expect(await app.line('exn_0')).toMatchObject({ kind: 'unread', date: night(0).toISOString() })
  })

  it('a network error or a page of another shape is not «no listing»: nothing changes', async () => {
    const app = createApp()
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    app.market.listings.set('cashdisco.com', { afternic: 7888, sedo: 7888, namecheap: 7888 })
    await app.run(0)
    const before = app.row('exn_cash')
    app.market.listings.delete('cashdisco.com')
    app.market.unreachable.add('sedo')
    app.market.garbled.add('afternic')

    for (let n = 1; n < 6; n++) await app.run(n)

    expect(app.row('exn_cash')).toEqual(before)
    expect(app.readings('exn_cash')).toEqual([
      { source: 'afternic', outcome: 'unread', amount: 7888, pending_amount: null },
      { source: 'namecheap', outcome: 'absent', amount: null, pending_amount: null },
      { source: 'sedo', outcome: 'unread', amount: 7888, pending_amount: null },
    ])
  })

  it('the leader’s new price is written on the second night, with the old one kept beside it', async () => {
    const app = createApp()
    app.forSale('exn_dark', 'darkmont.com', 2795)
    app.market.listings.set('darkmont.com', { afternic: 2795, sedo: 2795, namecheap: 2785 })
    await app.run(0)
    app.market.listings.set('darkmont.com', { afternic: 2995, sedo: 2995, namecheap: 2985 })

    expect(await app.run(1)).toMatchObject({ updated: 0 })
    expect(app.row('exn_dark')).toMatchObject({ purchase_price: 2795 })

    expect(await app.run(2)).toMatchObject({ updated: 1 })
    expect(app.row('exn_dark')).toMatchObject({ purchase_price: 2995, price_prev: 2795, price_source: 'afternic' })
    expect(await app.line('exn_dark')).toMatchObject({ kind: 'updated', source: 'afternic', prev: 2795, date: night(2).toISOString() })
  })

  it('a price a person saved while the run was reading is not overwritten', async () => {
    const app = createApp()
    app.forSale('exn_dark', 'darkmont.com', 2795)
    app.market.listings.set('darkmont.com', { afternic: 2795 })
    await app.run(0)
    app.market.listings.set('darkmont.com', { afternic: 2995 })
    await app.run(1)

    const run = runPriceCheck(app.env as never, {
      fetch: async (url, init) => {
        // The save lands between the reading and the writing.
        app.db.raw.prepare(`UPDATE external_namings SET purchase_price = 2500 WHERE id = 'exn_dark'`).run()
        return app.market.fetch(url, init)
      },
      sleep: async () => {},
      now: () => night(2),
    })
    await run

    expect(app.row('exn_dark')).toMatchObject({ purchase_price: 2500, price_prev: null })
  })

  it('no listing for three nights: «For sale» comes off the way «Автоматично» does, the registrar is asked at once', async () => {
    const app = createApp({ pananames: true })
    app.forSale('exn_dark', 'darkmont.com', 2795)
    app.market.listings.set('darkmont.com', { afternic: 2795, sedo: 2795, namecheap: 2785 })
    app.market.registrar.set('darkmont.com', false)
    await app.run(0)
    app.market.listings.delete('darkmont.com')

    await app.run(1)
    expect(await app.line('exn_dark')).toMatchObject({ kind: 'not_found' })
    await app.run(2)
    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'for_sale', price_absent_nights: 2 })
    expect(app.market.asked('registrar')).toEqual([])

    expect(await app.run(3)).toMatchObject({ delisted: 1 })
    expect(app.row('exn_dark')).toMatchObject({
      availability_status: 'sold',
      domain_check_source: 'pananames',
      price: null,
      purchase_price: 2795,
      price_source: null,
      price_delisted_at: night(3).toISOString(),
    })
    expect(app.market.asked('registrar')).toEqual(['darkmont.com'])
    expect(app.readings('exn_dark')).toEqual([])
    expect(await app.line('exn_dark')).toMatchObject({ kind: 'delisted', prev: 2795, date: night(3).toISOString() })

    // From here on it is an ordinary automatic row: not asked about again.
    app.market.calls.length = 0
    await app.run(4)
    expect(app.market.calls).toEqual([])
  })

  it('the domain freed up: Available with the registration price; no registrar key (the stage): Unknown', async () => {
    const freed = createApp({ pananames: true })
    freed.forSale('exn_dark', 'darkmont.com', 2795)
    freed.market.listings.set('darkmont.com', { afternic: 2795 })
    freed.market.registrar.set('darkmont.com', true)
    await freed.run(0)
    freed.market.listings.delete('darkmont.com')
    for (let n = 1; n < 4; n++) await freed.run(n)
    expect(freed.row('exn_dark')).toMatchObject({ availability_status: 'available', price: 15, purchase_price: 2795 })

    const stage = createApp()
    stage.forSale('exn_dark', 'darkmont.com', 2795)
    stage.market.listings.set('darkmont.com', { afternic: 2795 })
    await stage.run(0)
    stage.market.listings.delete('darkmont.com')
    for (let n = 1; n < 4; n++) await stage.run(n)
    expect(stage.row('exn_dark')).toMatchObject({ availability_status: 'unknown', domain_check_source: 'manual' })
    expect(stage.market.asked('registrar')).toEqual([])
  })

  it('a naming used in an approved brand is read for the table and never changed', async () => {
    const app = createApp({ pananames: true })
    app.forSale('exn_used', 'darkmont.com', 2795, 'used')
    app.market.listings.set('darkmont.com', { afternic: 2795 })
    await app.run(0)
    const approved = app.row('exn_used')
    expect(await app.line('exn_used')).toMatchObject({ kind: 'verified', source: 'afternic' })

    app.market.listings.set('darkmont.com', { afternic: 2995 })
    for (let n = 1; n < 4; n++) await app.run(n)
    expect(await app.line('exn_used')).toMatchObject({ kind: 'differs', amount: 2995 })
    app.market.listings.delete('darkmont.com')
    for (let n = 4; n < 9; n++) await app.run(n)

    expect(app.row('exn_used')).toEqual(approved)
    expect(await app.line('exn_used')).toMatchObject({ kind: 'not_found_manual' })
    expect(app.market.asked('registrar')).toEqual([])
  })

  it('more domains than one run may ask: the longest unchecked go first, the rest the next night', async () => {
    const app = createApp()
    const total = PRICE_CHECK_MAX_DOMAINS + 3
    for (let i = 0; i < total; i++) app.forSale(`exn_${String(i).padStart(2, '0')}`, `d${i}.com`, 1000)

    expect(await app.run(0)).toMatchObject({ domains: PRICE_CHECK_MAX_DOMAINS, postponed: 3 })
    app.market.calls.length = 0
    await app.run(1)

    const asked = app.market.asked('afternic')
    expect(asked).toHaveLength(PRICE_CHECK_MAX_DOMAINS)
    expect(asked.slice(0, 3).sort()).toEqual([`d${total - 3}.com`, `d${total - 2}.com`, `d${total - 1}.com`])
  })

  it('the registrar’s nightly check still leaves «For sale» rows alone', async () => {
    const app = createApp({ pananames: true })
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    app.market.registrar.set('cashdisco.com', true)
    await batchCheckDomains({ ...app.env, DB: app.db } as never)
    expect(app.row('exn_cash')).toMatchObject({ availability_status: 'for_sale', purchase_price: 7888 })
  })
})

d('the switch', () => {
  const scheduled = (env: unknown, cron: string) =>
    worker.scheduled({ cron, scheduledTime: Date.now() } as never, env as never, { waitUntil() {} } as never)

  it('without PRICE_CHECK_ENABLED the schedule asks no marketplace', async () => {
    const app = createApp({ enabled: false })
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    await scheduled(app.env, PRICE_CHECK_CRON)
    expect(app.market.calls).toEqual([])
    expect(app.readings('exn_cash')).toEqual([])
  })

  it('with it, the 06:30 entry runs the price check and the 06:00 one does not', async () => {
    const app = createApp()
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    app.market.listings.set('cashdisco.com', { afternic: 7888 })

    await scheduled(app.env, '0 6 * * *')
    expect(app.market.calls).toEqual([])

    await scheduled(app.env, PRICE_CHECK_CRON)
    expect(app.row('exn_cash')).toMatchObject({ price_source: 'afternic' })
  })

  it('without it the recheck button answers that the check is off and asks nothing', async () => {
    const app = createApp({ enabled: false })
    app.forSale('exn_cash', 'cashdisco.com', 7888)
    const res = await app.request('POST', '/api/namings/external/exn_cash/check-price', {})
    expect(res.status).toBe(503)
    expect(app.market.calls).toEqual([])
  })
})

d('the recheck button of a «For sale» row', () => {
  it('reads the three marketplaces for that row and returns it with its line', async () => {
    const app = createApp()
    app.forSale('exn_chamboo', 'chamboo.com', 2685)
    app.forSale('exn_other', 'darkmont.com', 2795)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })

    const res = await app.request('POST', '/api/namings/external/exn_chamboo/check-price', {})
    const body = (await res.json()) as { data: { purchase_price: number; price_check: Record<string, unknown> }; cached: boolean }

    expect(res.status).toBe(200)
    expect(body.cached).toBe(false)
    expect(body.data).toMatchObject({ purchase_price: 2685, price_check: { kind: 'verified', source: 'namecheap' } })
    expect(app.market.calls.flatMap(c => c.domains)).toEqual(['chamboo.com', 'chamboo.com', 'chamboo.com'])
  })

  it('a second press within the hour asks no marketplace again', async () => {
    const app = createApp()
    app.forSale('exn_chamboo', 'chamboo.com', 2685)
    app.market.listings.set('chamboo.com', { namecheap: 2685 })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(night(0))

    await app.request('POST', '/api/namings/external/exn_chamboo/check-price', {})
    vi.setSystemTime(new Date(night(0).getTime() + 59 * 60 * 1000))
    const again = await app.request('POST', '/api/namings/external/exn_chamboo/check-price', {})
    expect(((await again.json()) as { cached: boolean }).cached).toBe(true)
    expect(app.market.calls).toHaveLength(3)

    vi.setSystemTime(new Date(night(0).getTime() + 61 * 60 * 1000))
    await app.request('POST', '/api/namings/external/exn_chamboo/check-price', {})
    expect(app.market.calls).toHaveLength(6)
  })

  it('refuses a row that is not «For sale», a used one, and a role that does not edit namings', async () => {
    const app = createApp()
    app.forSale('exn_used', 'darkmont.com', 2795, 'used')
    app.forSale('exn_cash', 'cashdisco.com', 7888)

    expect((await app.request('POST', '/api/namings/external/ext_free/check-price', {})).status).toBe(400)
    expect((await app.request('POST', '/api/namings/external/exn_used/check-price', {})).status).toBe(409)
    expect((await app.request('POST', '/api/namings/external/exn_nope/check-price', {})).status).toBe(404)
    for (const user of ['po', 'ceo', 'pr', 'design'] as const) {
      expect((await app.request('POST', '/api/namings/external/exn_cash/check-price', {}, user)).status).toBe(403)
    }
    expect(app.market.calls).toEqual([])
  })
})

d('«Оновити ціну» and «Залишити поточну»', () => {
  /** Chamboo at 2 600 by hand; Namecheap, which led it, asks 2 685. */
  async function offered() {
    const app = createApp()
    app.forSale('exn_chamboo', 'chamboo.com', 2685)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })
    await app.run(0)
    await app.request('PUT', '/api/namings/external/exn_chamboo', { availability_status: 'for_sale', purchase_price: 2600 })
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'proposal', source: 'namecheap', amount: 2685 })
    return app
  }
  const decide = (app: ReturnType<typeof createApp>, body: unknown, user: UserKey = 'admin') =>
    app.request('POST', '/api/namings/external/exn_chamboo/price-decision', body, user)

  it('accept: the marketplace’s price is in the record and the row is verified', async () => {
    const app = await offered()
    const res = await decide(app, { action: 'accept', source: 'namecheap', amount: 2685 })

    expect(res.status).toBe(200)
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2685, price_source: 'namecheap', price_synced: 2685 })
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'verified', source: 'namecheap' })
  })

  it('accept with a price the marketplace no longer has is refused and nothing changes', async () => {
    const app = await offered()
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2900 })
    await app.run(1)

    const stale = await decide(app, { action: 'accept', source: 'namecheap', amount: 2685 })
    const made_up = await decide(app, { action: 'accept', source: 'namecheap', amount: 1 })
    const other = await decide(app, { action: 'accept', source: 'afternic', amount: 2695 })

    expect([stale.status, made_up.status, other.status]).toEqual([409, 409, 409])
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2600 })
  })

  it('keep: the price stays, the offer becomes a grey line and returns only with a new marketplace price', async () => {
    const app = await offered()
    const res = await decide(app, { action: 'keep', source: 'namecheap', amount: 2685 })

    expect(res.status).toBe(200)
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2600 })
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'differs', source: 'namecheap', amount: 2685 })

    for (let n = 1; n < 5; n++) await app.run(n)
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2600 })
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'differs' })

    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2900 })
    await app.run(5)
    expect(await app.line('exn_chamboo')).toMatchObject({ kind: 'proposal', source: 'namecheap', amount: 2900 })
  })

  it('refused for a used naming, for a row with nothing on offer and for a role that does not edit namings', async () => {
    const app = await offered()
    expect((await decide(app, { action: 'accept', source: 'namecheap', amount: 2685 }, 'po')).status).toBe(403)
    expect((await decide(app, { action: 'accept', source: 'namecheap', amount: 2685 }, 'pr')).status).toBe(403)
    expect((await decide(app, { action: 'buy', source: 'namecheap', amount: 2685 })).status).toBe(400)

    app.db.raw.prepare(`UPDATE external_namings SET status = 'used' WHERE id = 'exn_chamboo'`).run()
    expect((await decide(app, { action: 'accept', source: 'namecheap', amount: 2685 })).status).toBe(409)
    expect(app.row('exn_chamboo')).toMatchObject({ purchase_price: 2600 })
  })
})

d('a person’s save and the price check', () => {
  async function led() {
    const app = createApp()
    app.forSale('exn_dark', 'darkmont.com', 2795)
    app.market.listings.set('darkmont.com', { afternic: 2795, sedo: 2795, namecheap: 2785 })
    app.market.listings.set('other.com', { afternic: 9000 })
    await app.run(0)
    return app
  }

  it('a new domain drops the readings of the old one and everything known about the price', async () => {
    const app = await led()
    app.market.listings.set('darkmont.com', { afternic: 2995 })
    await app.run(1)
    expect(app.readings('exn_dark').find(r => r.source === 'afternic')?.pending_amount).toBe(2995)

    await app.request('PUT', '/api/namings/external/exn_dark', { domain: 'other.com' })

    expect(app.readings('exn_dark')).toEqual([])
    expect(app.row('exn_dark')).toMatchObject({ domain: 'other.com', purchase_price: 2795, price_source: null, price_synced: null })
    expect(await app.line('exn_dark')).toBeNull()

    // The old domain's pending price never reaches the record.
    await app.run(2)
    await app.run(3)
    expect(app.row('exn_dark')).toMatchObject({ purchase_price: 2795 })
    expect(await app.line('exn_dark')).toMatchObject({ kind: 'proposal', source: 'afternic', amount: 9000 })
  })

  it('a price typed by a person is not followed by the marketplace any more', async () => {
    const app = await led()
    await app.request('PUT', '/api/namings/external/exn_dark', { availability_status: 'for_sale', purchase_price: 2500 })
    app.market.listings.set('darkmont.com', { afternic: 2600, sedo: 2600, namecheap: 2590 })
    for (let n = 1; n < 5; n++) await app.run(n)
    app.market.listings.delete('darkmont.com')
    for (let n = 5; n < 10; n++) await app.run(n)

    expect(app.row('exn_dark')).toMatchObject({ purchase_price: 2500, availability_status: 'for_sale' })
  })

  it('a save that changes neither the domain nor the price keeps the lead', async () => {
    const app = await led()
    await app.request('PUT', '/api/namings/external/exn_dark', {
      name: 'Darkmont',
      domain: 'darkmont.com',
      availability_status: 'for_sale',
      purchase_price: 2795,
    })
    expect(app.row('exn_dark')).toMatchObject({ price_source: 'afternic', price_synced: 2795 })
    expect(app.readings('exn_dark')).toHaveLength(3)
  })

  it('«Автоматично» chosen by a person with no listing anywhere leaves no trace of the price check', async () => {
    const app = await led()
    app.market.listings.delete('darkmont.com')
    await app.request('PUT', '/api/namings/external/exn_dark', { domain_check_source: 'manual' })
    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'unknown', price_source: null, price_delisted_at: null })
    expect(await app.line('exn_dark')).toBeNull()
  })

  it('«Автоматично» chosen over a typed price: the marketplace’s price comes back at once', async () => {
    const app = await led()
    await app.request('PUT', '/api/namings/external/exn_dark', { availability_status: 'for_sale', purchase_price: 2500 })
    expect((await app.rowFromList('exn_dark')).price_auto).toBe(false)

    await app.request('PUT', '/api/namings/external/exn_dark', { domain_check_source: 'manual' })

    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'for_sale', purchase_price: 2795, price_source: 'afternic' })
    expect((await app.rowFromList('exn_dark')).price_auto).toBe(true)
  })

  it('«For sale» set again after an automatic removal is not taken off while there is no listing', async () => {
    const app = await led()
    app.market.listings.delete('darkmont.com')
    for (let n = 1; n < 4; n++) await app.run(n)
    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'unknown' })

    const res = await app.request('PUT', '/api/namings/external/exn_dark', { availability_status: 'for_sale', purchase_price: 2795 })
    expect(res.status).toBe(200)
    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'for_sale', price_delisted_at: null })
    for (let n = 4; n < 10; n++) await app.run(n)

    expect(app.row('exn_dark')).toMatchObject({ availability_status: 'for_sale', purchase_price: 2795 })
    expect(await app.line('exn_dark')).toMatchObject({ kind: 'not_found_manual' })
  })

  it('deleting a naming deletes its readings', async () => {
    const app = await led()
    await app.request('DELETE', '/api/namings/external/exn_dark')
    expect(app.readings('exn_dark')).toEqual([])
  })
})

d('a taken domain gets «For sale» without anyone typing it', () => {
  it('a new naming whose domain a marketplace sells is For sale with that price at once', async () => {
    const app = createApp()
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })

    const res = await app.request('POST', '/api/namings/external', { name: 'Chamboo', domain: 'chamboo.com' })
    const { data } = (await res.json()) as { data: { id: string; availability_status: string; purchase_price: number } }

    expect(res.status).toBe(201)
    expect(data).toMatchObject({ availability_status: 'for_sale', purchase_price: 2695 })
    expect(app.row(data.id)).toMatchObject({ domain_check_source: 'admin_override', price: null, price_source: 'afternic' })
    expect((await app.rowFromList(data.id)).price_auto).toBe(true)
    expect(app.market.calls.filter(c => c.marketplace !== 'registrar')).toHaveLength(3)
  })

  it('a domain nobody sells stays as the registrar left it; a free one is not asked about at all', async () => {
    const app = createApp({ pananames: true })
    app.market.registrar.set('nobody.com', false)
    app.market.registrar.set('free.com', true)

    const taken = await app.request('POST', '/api/namings/external', { name: 'Nobody', domain: 'nobody.com' })
    const free = await app.request('POST', '/api/namings/external', { name: 'Free', domain: 'free.com' })

    expect(((await taken.json()) as { data: object }).data).toMatchObject({ availability_status: 'sold', purchase_price: null })
    expect(((await free.json()) as { data: object }).data).toMatchObject({ availability_status: 'available', price: 15 })
    expect(app.market.calls.filter(c => c.marketplace !== 'registrar').flatMap(c => c.domains)).toEqual([
      'nobody.com',
      'nobody.com',
      'nobody.com',
    ])
  })

  it('a new domain on an existing naming is asked about on the save', async () => {
    const app = createApp()
    app.taken('exn_x', 'nobody.com', 'unknown', 'manual')
    app.market.listings.set('chamboo.com', { namecheap: 2685 })

    await app.request('PUT', '/api/namings/external/exn_x', { domain: 'chamboo.com' })

    expect(app.row('exn_x')).toMatchObject({ availability_status: 'for_sale', purchase_price: 2685, price_source: 'namecheap' })
  })

  it('«For sale» with a typed price is not asked about and not replaced on the save', async () => {
    const app = createApp()
    app.market.listings.set('chamboo.com', { afternic: 2695 })

    const res = await app.request('POST', '/api/namings/external', {
      name: 'Chamboo',
      domain: 'chamboo.com',
      availability_status: 'for_sale',
      purchase_price: 2000,
    })
    const { data } = (await res.json()) as { data: { id: string } }

    expect(app.row(data.id)).toMatchObject({ purchase_price: 2000, price_source: null })
    expect((await app.rowFromList(data.id)).price_auto).toBe(false)
    expect(app.market.calls).toEqual([])
  })

  it('with the switch off a save asks no marketplace', async () => {
    const app = createApp({ enabled: false })
    app.market.listings.set('chamboo.com', { afternic: 2695 })
    await app.request('POST', '/api/namings/external', { name: 'Chamboo', domain: 'chamboo.com' })
    expect(app.market.calls).toEqual([])
  })

  it('the recheck of an automatic row asks the marketplaces too — also where there is no registrar', async () => {
    const app = createApp()
    app.taken('exn_x', 'chamboo.com', 'unknown', 'manual')
    app.market.listings.set('chamboo.com', { afternic: 2695 })

    const res = await app.request('POST', '/api/namings/external/exn_x/check-domain', {})
    const body = (await res.json()) as { data: { availability_status: string; price_auto: boolean } }

    expect(res.status).toBe(200)
    expect(body.data).toMatchObject({ availability_status: 'for_sale', purchase_price: 2695, price_auto: true })
  })

  it('the nightly discovery: one request to Namecheap for every taken domain, Afternic and Sedo for the ones it lists first', async () => {
    const app = createApp()
    const total = DISCOVERY_MAX_DOMAINS + 5
    for (let i = 0; i < total; i++) app.taken(`exn_${String(i).padStart(2, '0')}`, `d${i}.com`)
    app.market.listings.set(`d${total - 1}.com`, { afternic: 5000, namecheap: 4990 })
    app.forSale('exn_typed', 'typed.com', 100)
    app.forSale('exn_used', 'used.com', 100, 'used')
    app.db.raw
      .prepare(
        `INSERT INTO external_namings (id, name, domain, price, availability_status, domain_check_source, created_by)
         VALUES ('exn_free', 'free', 'free.com', 15, 'available', 'pananames', 'usr_admin'),
                ('exn_old', 'oldie', 'oldie.com', NULL, 'sold', 'admin_override', 'usr_admin')`
      )
      .run()

    const summary = await app.discover(0)

    expect(summary).toMatchObject({ domains: total, asked: DISCOVERY_MAX_DOMAINS, listed: 1, refused: [] })
    expect(app.market.asked('namecheap')).toHaveLength(1)
    expect(app.market.asked('namecheap')[0].split(',')).toHaveLength(total)
    expect(app.market.asked('afternic')).toHaveLength(DISCOVERY_MAX_DOMAINS)
    expect(app.market.asked('afternic')[0]).toBe(`d${total - 1}.com`)
    const asked = app.market.calls.flatMap(c => c.domains.join(',').split(','))
    for (const domain of ['typed.com', 'used.com', 'free.com', 'oldie.com']) expect(asked).not.toContain(domain)
    for (const call of app.market.calls) expect(call.userAgent).toBe(PRICE_CHECK_USER_AGENT)

    expect(app.row(`exn_${total - 1}`)).toMatchObject({
      availability_status: 'for_sale',
      domain_check_source: 'admin_override',
      purchase_price: 5000,
      price_source: 'afternic',
    })
    expect(app.row('exn_00')).toMatchObject({ availability_status: 'sold', purchase_price: null })
    expect(app.row('exn_typed')).toMatchObject({ purchase_price: 100 })

    // The next night starts with the domains Afternic was not asked about.
    app.market.calls.length = 0
    await app.discover(1)
    const second = app.market.asked('afternic')
    expect(second).not.toContain(`d${total - 1}.com`)
    expect(second.slice(0, 5).sort()).toEqual(['d14.com', 'd15.com', 'd16.com', 'd17.com', 'd18.com'])
  })

  it('a refusal stops the discovery for that marketplace and puts nothing For sale on a guess', async () => {
    const app = createApp()
    for (let i = 0; i < 4; i++) {
      app.taken(`exn_${i}`, `d${i}.com`)
      app.market.listings.set(`d${i}.com`, { afternic: 1000 })
    }
    app.market.refusing.add('afternic')

    const summary = await app.discover(0)

    expect(app.market.asked('afternic')).toHaveLength(1)
    expect(summary).toMatchObject({ listed: 0, refused: ['afternic'] })
    for (let i = 0; i < 4; i++) expect(app.row(`exn_${i}`)).toMatchObject({ availability_status: 'sold', purchase_price: null })
  })

  it('the schedule: 06:45 runs the discovery, and not without the switch', async () => {
    const scheduled = (env: unknown) =>
      worker.scheduled({ cron: PRICE_DISCOVERY_CRON, scheduledTime: Date.now() } as never, env as never, { waitUntil() {} } as never)
    const off = createApp({ enabled: false })
    off.taken('exn_x', 'chamboo.com')
    await scheduled(off.env)
    expect(off.market.calls).toEqual([])

    const on = createApp()
    on.taken('exn_x', 'chamboo.com')
    on.market.listings.set('chamboo.com', { sedo: 2695 })
    await scheduled(on.env)
    expect(on.row('exn_x')).toMatchObject({ availability_status: 'for_sale', purchase_price: 2695, price_source: 'sedo' })
  })

  it('found by the discovery, then followed by the 06:30 run like any For sale row', async () => {
    const app = createApp()
    app.taken('exn_x', 'chamboo.com')
    app.market.listings.set('chamboo.com', { afternic: 2695 })
    await app.discover(0)
    app.market.listings.set('chamboo.com', { afternic: 2995 })
    await app.run(1)
    await app.run(2)
    expect(app.row('exn_x')).toMatchObject({ purchase_price: 2995, price_prev: 2695 })
    expect(await app.line('exn_x')).toMatchObject({ kind: 'updated', prev: 2695 })
  })
})

d('migration 016', () => {
  it('adds the readings table and the price check columns to a base that has none', () => {
    const before = SCHEMA_SQL.replace(/CREATE TABLE IF NOT EXISTS naming_price_checks \([\s\S]*?\);\n/, '').replace(
      /\s*-- Price check of a «For sale» domain[^\n]*\n(\s*price_[a-z_]+ [^\n]*\n)+/,
      '\n'
    )
    expect(before).not.toContain('naming_price_checks')
    expect(before).not.toContain('price_source')
    const db = createTestD1(before)
    db.raw.exec(readMigration('016_naming_price_checks.sql'))

    const columns = (table: string) =>
      (db.raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)
    const fromSchema = createTestD1()
    const schemaColumns = (table: string) =>
      (fromSchema.raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name)

    expect(columns('naming_price_checks')).toEqual(schemaColumns('naming_price_checks'))
    expect(columns('external_namings').sort()).toEqual(schemaColumns('external_namings').sort())
    expect(
      db.raw.prepare(`SELECT dflt_value FROM pragma_table_info('external_namings') WHERE name = 'price_absent_nights'`).get()
    ).toEqual({ dflt_value: '0' })
  })
})
