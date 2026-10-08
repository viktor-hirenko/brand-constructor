import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import namings from '../../../src/routes/namings'
import { PRICE_RUN_MAX_DOMAINS, runPriceCheck, runPriceDiscovery, runPriceNight } from '../../../src/utils/price-check'
import { DYNADOT_RUN_REQUESTS, parseDynadot } from '../../../src/utils/price-dynadot'
import { loadPriceHealth, reportPriceNight } from '../../../src/utils/price-health'
import { USERS, seedLibrary } from '../../helpers/brandApp'
import { DYNADOT_EUR_RATE, createMarketplaces, type DynadotFault } from '../../helpers/marketplaces'
import { createTestD1, hasNodeSqlite } from '../../helpers/sqliteD1'

/**
 * Afternic and Sedo through Dynadot's API (docs/architecture/domain-price-sync-plan.md,
 * 08.10). The marketplaces' own addresses are nobody's API; with a key they
 * are asked only where Dynadot cannot answer. Here: that the night gets the
 * same readings either way, that it goes to a marketplace itself exactly in
 * the three cases the live run showed, and that Dynadot being silent costs a
 * warning and not a price.
 */

const d = hasNodeSqlite ? describe : describe.skip
const KEY = 'test-dynadot-key'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const night = (n: number) => new Date(Date.UTC(2026, 9, 7 + n, 0, 30))

function createApp(options: { key?: boolean } = {}) {
  const db = createTestD1()
  seedLibrary(db)
  db.raw.exec('DELETE FROM external_namings')
  const market = createMarketplaces()
  const slack: { text: string; blocks: { text: { text: string } }[] }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input).startsWith('https://slack.com/')) {
        slack.push(JSON.parse(String(init?.body)))
        return new Response(JSON.stringify({ ok: true }))
      }
      return market.fetch(input, init)
    })
  )
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, USERS.admin as never)
    await next()
  })
  app.route('/api/namings', namings as never)
  const env = {
    DB: db,
    PANANAMES_SIGNATURE: '',
    PRICE_CHECK_ENABLED: 'true',
    DYNADOT_API_KEY: options.key === false ? undefined : KEY,
    SLACK_BOT_TOKEN: 'xoxb-test',
    SLACK_CHANNEL_PRICE_ALERTS: 'C_PRICES',
  }
  const insert = db.raw.prepare(
    `INSERT INTO external_namings (id, name, domain, purchase_price, availability_status, domain_check_source, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'usr_admin', '2026-09-01 10:00:00')`
  )
  const deps = (n: number) => ({ fetch: market.fetch, sleep: async () => {}, now: () => night(n) })
  return {
    db,
    env,
    market,
    slack,
    forSale: (domain: string, price: number) => insert.run(`exn_${domain}`, domain, domain, price, 'for_sale', 'admin_override'),
    taken: (domain: string) => insert.run(`exn_${domain}`, domain, domain, null, 'sold', 'pananames'),
    check: (n: number) => runPriceCheck(env as never, deps(n)),
    discover: (n: number) => runPriceDiscovery(env as never, deps(n)),
    fire: (n: number) => runPriceNight(env as never, deps(n)),
    readings(domain: string) {
      const rows = db.raw
        .prepare('SELECT source, outcome, amount, currency FROM naming_price_checks WHERE naming_id = ? ORDER BY source')
        .all(`exn_${domain}`) as { source: string; outcome: string; amount: number | null; currency: string | null }[]
      return Object.fromEntries(rows.map(r => [r.source, r.outcome === 'listed' ? `${r.amount} ${r.currency}` : r.outcome]))
    },
    row: (domain: string) =>
      db.raw.prepare('SELECT * FROM external_namings WHERE id = ?').get(`exn_${domain}`) as Record<string, unknown>,
    /** Who was asked, in order, since the last call. */
    asked() {
      const seen = market.calls.map(c => `${c.marketplace}:${c.domains.join(',')}`)
      market.calls.length = 0
      return seen
    },
    post: (path: string, body: unknown) =>
      app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, env),
  }
}

d('with a key the night asks Dynadot', () => {
  it('twice per domain and Namecheap once — and neither marketplace at its own address while their prices agree', async () => {
    const app = createApp()
    app.forSale('chamboo.com', 2695)
    app.forSale('beepzy.com', 1995)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })
    app.market.listings.set('beepzy.com', { afternic: 1995, sedo: 1995, namecheap: 1990 })

    await app.check(0)

    expect(app.asked()).toEqual([
      'namecheap:beepzy.com,chamboo.com',
      'dynadot-afternic:beepzy.com',
      'dynadot-sedo:beepzy.com',
      'dynadot-afternic:chamboo.com',
      'dynadot-sedo:chamboo.com',
    ])
    expect(app.readings('chamboo.com')).toEqual({ afternic: '2695 USD', namecheap: '2685 USD', sedo: '2695 USD' })
    expect(app.row('chamboo.com')).toMatchObject({ purchase_price: 2695, price_source: 'afternic' })
  })

  it('the readings are the ones the marketplaces’ own addresses give — the rules see no difference', async () => {
    const listings = {
      'chamboo.com': { afternic: 2695, sedo: 2695, namecheap: 2685 },
      'pixellia.com': { afternic: 3099, namecheap: 3099 },
      'cashdisco.com': { afternic: 7888, sedo: 'offers' as const, namecheap: 7888 },
      'hitgroove.com': { afternic: 2000, sedo: { eur: 1300 }, namecheap: 1450 },
      'boomico.com': { afternic: 'lander' as const, sedo: 3315, namecheap: 3300 },
    }
    const run = async (key: boolean) => {
      const app = createApp({ key })
      for (const [domain, listing] of Object.entries(listings)) {
        app.forSale(domain, 1000)
        app.market.listings.set(domain, listing)
      }
      await app.check(0)
      return Object.fromEntries(Object.keys(listings).map(domain => [domain, app.readings(domain)]))
    }
    expect(await run(true)).toEqual(await run(false))
  })

  it('the key goes in the Authorization header and never in the address', async () => {
    const app = createApp()
    app.forSale('chamboo.com', 2695)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695 })
    await app.check(0)

    const calls = app.market.calls.filter(c => c.marketplace.startsWith('dynadot'))
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.authorization).toBe(`Bearer ${KEY}`)
      expect(call.url).not.toContain(KEY)
    }
  })

  it('without a key Dynadot is never asked', async () => {
    const app = createApp({ key: false })
    app.forSale('chamboo.com', 2695)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695 })
    await app.check(0)
    expect(app.asked()).toEqual(['namecheap:chamboo.com', 'afternic:chamboo.com', 'sedo:chamboo.com'])
  })
})

d('what Dynadot says is taken to the letter', () => {
  it('domains like the one asked are not the one asked: a taken domain nobody sells stays as it was', async () => {
    const app = createApp()
    app.taken('google.com')
    await app.discover(0)

    expect(app.asked()).toEqual(['namecheap:google.com', 'dynadot-afternic:google.com', 'dynadot-sedo:google.com'])
    expect(app.readings('google.com')).toEqual({ afternic: 'absent', namecheap: 'absent', sedo: 'absent' })
    expect(app.row('google.com')).toMatchObject({ availability_status: 'sold', purchase_price: null })
  })

  it('a price of 0 is «offers only», never a price', async () => {
    const app = createApp()
    app.taken('rollypop.com')
    app.market.listings.set('rollypop.com', { sedo: 'offers' })
    await app.discover(0)

    expect(app.readings('rollypop.com').sedo).toBe('no_fixed_price')
    expect(app.row('rollypop.com')).toMatchObject({ availability_status: 'sold', purchase_price: null })
    // Dynadot said it all: Sedo itself is not asked.
    expect(app.asked()).toEqual(['namecheap:rollypop.com', 'dynadot-afternic:rollypop.com', 'dynadot-sedo:rollypop.com'])
    const body = JSON.stringify({ code: 200, data: { sedo_domain_list: [{ domain_name: 'rollypop.com', price_in_usd_pennies: '0' }] } })
    expect(parseDynadot('sedo', 'rollypop.com', 200, body)).toMatchObject({ outcome: 'no_fixed_price', amount: null, currency: null })
  })

  it.each([
    ['not JSON', 200, '<html>Maintenance</html>'],
    ['another shape', 200, '{"code":200,"data":{"domains":[]}}'],
    ['a price that is not a whole number of cents', 200, '{"code":200,"data":{"afternic_domain_list":[{"domain_name":"a.com","price_in_usd_pennies":"12.5"}]}}'],
    ['an error with a body', 500, '{"code":500,"message":"Internal Server Error"}'],
    ['a refusal', 401, '{"code":401,"message":"Unauthorized"}'],
    ['404 that is not Dynadot’s «no listing»', 404, '<html>Not Found</html>'],
  ])('%s is no answer — not «no listing» and not a number', (_, status, body) => {
    expect(parseDynadot('afternic', 'a.com', status, body)).toBeNull()
  })

  it('the name is compared whole and without regard to case', () => {
    const body = JSON.stringify({ code: 200, data: { sedo_domain_list: [{ domain_name: 'MyA.com', price_in_usd_pennies: '100' }, { domain_name: 'A.COM', price_in_usd_pennies: '269500' }] } })
    expect(parseDynadot('sedo', 'a.com', 200, body)).toMatchObject({ outcome: 'listed', amount: 2695, currency: 'USD' })
    expect(parseDynadot('sedo', 'b.com', 200, body)).toMatchObject({ outcome: 'absent', amount: null })
  })
})

d('the three cases a marketplace is asked itself', () => {
  it('Sedo’s price is not Afternic’s: a price in euros comes from Dynadot as dollars — Sedo itself says what it is', async () => {
    const app = createApp()
    app.forSale('hitgroove.com', 2000)
    app.market.listings.set('hitgroove.com', { afternic: 2000, sedo: { eur: 1300 }, namecheap: 1450 })
    await app.check(0)

    expect(app.asked()).toEqual([
      'namecheap:hitgroove.com',
      'dynadot-afternic:hitgroove.com',
      'dynadot-sedo:hitgroove.com',
      'sedo:hitgroove.com',
    ])
    const converted = Math.round(1300 * DYNADOT_EUR_RATE)
    expect(app.readings('hitgroove.com').sedo).toBe('no_fixed_price')
    expect(app.readings('hitgroove.com').sedo).not.toBe(`${converted} USD`)
  })

  it('Sedo lists a domain Afternic does not: nothing to compare with, Sedo itself is asked', async () => {
    const app = createApp()
    app.taken('boomico.com')
    app.market.listings.set('boomico.com', { sedo: 3315 })
    await app.discover(0)

    expect(app.asked()).toEqual(['namecheap:boomico.com', 'dynadot-afternic:boomico.com', 'dynadot-sedo:boomico.com', 'sedo:boomico.com'])
    expect(app.row('boomico.com')).toMatchObject({ availability_status: 'for_sale', purchase_price: 3315, price_source: 'sedo' })
  })

  it('a «For sale» row Afternic does not list: «make an offer» is no listing to Dynadot, so Afternic itself is asked', async () => {
    const app = createApp()
    app.forSale('boomico.com', 3300)
    app.market.listings.set('boomico.com', { afternic: 'lander', namecheap: 3300 })
    await app.check(0)

    expect(app.asked()).toEqual(['namecheap:boomico.com', 'dynadot-afternic:boomico.com', 'afternic:boomico.com', 'dynadot-sedo:boomico.com'])
    expect(app.readings('boomico.com').afternic).toBe('no_fixed_price')
  })

  it('…and three such nights do not take «For sale» off a domain that still has its «make an offer» page', async () => {
    const app = createApp()
    app.forSale('boomico.com', 3300)
    app.market.listings.set('boomico.com', { afternic: 3300 })
    await app.check(0)
    expect(app.row('boomico.com')).toMatchObject({ price_source: 'afternic' })

    app.market.listings.set('boomico.com', { afternic: 'lander' })
    for (const n of [1, 2, 3, 4]) await app.check(n)
    expect(app.row('boomico.com')).toMatchObject({ availability_status: 'for_sale', purchase_price: 3300 })
  })

  it('a taken domain is not «For sale»: its «no listing» is not confirmed, the marketplaces hear nothing', async () => {
    const app = createApp()
    app.taken('apple.com')
    app.market.listings.set('apple.com', { afternic: 'lander' })
    await app.discover(0)
    expect(app.asked()).toEqual(['namecheap:apple.com', 'dynadot-afternic:apple.com', 'dynadot-sedo:apple.com'])
  })
})

d('Dynadot does not answer', () => {
  it.each<DynadotFault>(['down', 'unauthorized', 'limited', 'garbled', 'unreachable'])(
    '%s: the marketplaces are read at their own addresses, Dynadot is left alone for the run, the prices are read',
    async fault => {
      const app = createApp()
      for (const domain of ['a1.com', 'a2.com', 'a3.com']) {
        app.forSale(domain, 1500)
        app.market.listings.set(domain, { afternic: 1500, sedo: 1500, namecheap: 1490 })
      }
      app.market.dynadot.fault = fault
      const summary = await app.check(0)

      expect(app.asked()).toEqual([
        'namecheap:a1.com,a2.com,a3.com',
        'dynadot-afternic:a1.com',
        'afternic:a1.com',
        'dynadot-sedo:a1.com',
        'sedo:a1.com',
        'afternic:a2.com',
        'sedo:a2.com',
        'afternic:a3.com',
        'sedo:a3.com',
      ])
      expect(summary.unread).toEqual({ afternic: 0, sedo: 0, namecheap: 0 })
      for (const domain of ['a1.com', 'a2.com', 'a3.com']) {
        expect(app.readings(domain)).toEqual({ afternic: '1500 USD', namecheap: '1490 USD', sedo: '1500 USD' })
      }
    }
  )

  it('about one marketplace only: the other still goes through Dynadot', async () => {
    const app = createApp()
    for (const domain of ['a1.com', 'a2.com']) {
      app.forSale(domain, 1500)
      app.market.listings.set(domain, { afternic: 1500, sedo: 1500 })
    }
    app.market.dynadotFaults.set('sedo', 'down')
    await app.check(0)

    expect(app.asked()).toEqual([
      'namecheap:a1.com,a2.com',
      'dynadot-afternic:a1.com',
      'dynadot-sedo:a1.com',
      'sedo:a1.com',
      'dynadot-afternic:a2.com',
      'sedo:a2.com',
    ])
  })

  it('the next run asks Dynadot again', async () => {
    const app = createApp()
    app.forSale('a1.com', 1500)
    app.market.listings.set('a1.com', { afternic: 1500, sedo: 1500 })
    app.market.dynadot.fault = 'down'
    await app.check(0)
    app.asked()

    app.market.dynadot.fault = null
    await app.check(1)
    expect(app.asked()).toEqual(['namecheap:a1.com', 'dynadot-afternic:a1.com', 'dynadot-sedo:a1.com'])
  })

  it('the night’s report says so in Slack; the line above the namings table has nothing to say — the prices came', async () => {
    const app = createApp()
    for (const domain of ['a1.com', 'a2.com', 'a3.com']) {
      app.forSale(domain, 1500)
      app.market.listings.set(domain, { afternic: 1500, sedo: 1500, namecheap: 1490 })
    }
    app.market.dynadot.fault = 'down'
    await app.check(0)

    expect((await loadPriceHealth(app.db as never, night(0).toISOString().slice(0, 10))).problems).toEqual([])
    expect(await reportPriceNight(app.env as never, night(0))).toBe('sent')
    expect(app.slack).toHaveLength(1)
    expect(app.slack[0].blocks[0].text.text).toContain(
      '• Dynadot не відповідає щодо Afternic і Sedo. Ціни читаються напряму з сайтів, як раніше.'
    )
  })

  it('Dynadot answers: the report has nothing to add and sends nothing', async () => {
    const app = createApp()
    app.forSale('a1.com', 1500)
    app.market.listings.set('a1.com', { afternic: 1500, sedo: 1500, namecheap: 1490 })
    await app.check(0)

    expect(await reportPriceNight(app.env as never, night(0))).toBe('ok')
    expect(app.slack).toEqual([])
  })
})

d('a run stays inside its allowance of requests out', () => {
  it('nineteen domains at two requests each fill a run; the twentieth waits five minutes for the next firing', async () => {
    const app = createApp()
    for (let i = 0; i < PRICE_RUN_MAX_DOMAINS; i++) {
      app.forSale(`s${String(i).padStart(2, '0')}.com`, 1000)
      app.market.listings.set(`s${String(i).padStart(2, '0')}.com`, { afternic: 1000, sedo: 1000 })
    }
    const summary = await app.check(0)
    expect(summary).toMatchObject({ domains: PRICE_RUN_MAX_DOMAINS - 1, postponed: 1 })
    expect(app.market.calls.length).toBeLessThanOrEqual(1 + DYNADOT_RUN_REQUESTS)
  })

  it('every request at a marketplace’s own address takes the place of a domain — which the next firing asks about, nothing written of it meanwhile', async () => {
    const app = createApp()
    const domains = Array.from({ length: PRICE_RUN_MAX_DOMAINS }, (_, i) => `e${String(i).padStart(2, '0')}.com`)
    for (const domain of domains) {
      app.forSale(domain, 2000)
      // Euros at Sedo: every domain costs a third request.
      app.market.listings.set(domain, { afternic: 2000, sedo: { eur: 1300 } })
    }

    const first = await app.fire(0)
    expect(app.market.calls.length).toBeLessThanOrEqual(1 + DYNADOT_RUN_REQUESTS)
    expect(first).toMatchObject({ job: 'check' })
    const done = first.job === 'check' ? first.summary.domains : 0
    expect(done).toBe(Math.floor(DYNADOT_RUN_REQUESTS / 3))
    expect(first.job === 'check' && first.summary.postponed).toBe(domains.length - done)
    // Not reached is not «unread»: no reading at all.
    expect(app.readings(domains[domains.length - 1])).toEqual({})

    app.market.calls.length = 0
    const second = await app.fire(0)
    expect(second.job === 'check' && second.summary.domains).toBe(domains.length - done)
    expect(app.market.calls.length).toBeLessThanOrEqual(1 + DYNADOT_RUN_REQUESTS)
    for (const domain of domains) expect(app.readings(domain).afternic).toBe('2000 USD')
    expect(await app.fire(0)).toEqual({ job: 'idle' })
  })
})

d('outside the night', () => {
  it('«Перевірити зараз» on a row goes through Dynadot too', async () => {
    const app = createApp()
    app.forSale('chamboo.com', 2695)
    app.market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })

    const res = await app.post('/api/namings/external/exn_chamboo.com/check-price', {})
    expect(res.status).toBe(200)
    expect(app.asked().sort()).toEqual(['dynadot-afternic:chamboo.com', 'dynadot-sedo:chamboo.com', 'namecheap:chamboo.com'])
    expect(app.readings('chamboo.com')).toEqual({ afternic: '2695 USD', namecheap: '2685 USD', sedo: '2695 USD' })
  })

  it('a domain being typed in a window is still read at the marketplaces themselves — one person, one domain, and no wait', async () => {
    const app = createApp()
    app.market.listings.set('joystones.com', { afternic: 3695, sedo: 3695, namecheap: 3680 })

    const res = await app.post('/api/namings/external/preview-price', { domain: 'joystones.com' })
    expect(((await res.json()) as { data: { price: number } }).data.price).toBe(3695)
    expect(app.asked().sort()).toEqual(['afternic:joystones.com', 'namecheap:joystones.com', 'sedo:joystones.com'])
  })
})
