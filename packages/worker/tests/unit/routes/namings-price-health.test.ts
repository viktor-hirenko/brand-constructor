import { Hono } from 'hono'
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../../../src/index'
import namings from '../../../src/routes/namings'
import { PRICE_NIGHT_CRON, PRICE_RUN_MAX_DOMAINS, runPriceNight } from '../../../src/utils/price-check'
import {
  buildPriceHealthMessage,
  isLastFiringOfNight,
  loadPriceHealth,
  nightDateOf,
  reportPriceNight,
  summarizePriceHealth,
  type HealthRow,
} from '../../../src/utils/price-health'
import { USERS, seedLibrary } from '../../helpers/brandApp'
import { createMarketplaces, type Marketplace } from '../../helpers/marketplaces'
import { createTestD1, hasNodeSqlite } from '../../helpers/sqliteD1'

/**
 * A marketplace that stops answering changes no record — and so nobody learnt
 * of it (the owner, 08.10: «мы даже не узнаем, что сайт не работает»). The
 * night now says so: a line above the namings table and one Slack message,
 * both only when something is wrong (docs/architecture/domain-price-sync-plan.md).
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** 00:30 UTC of the n-th night; its date. */
const night = (n: number) => new Date(Date.UTC(2026, 9, 7 + n, 0, 30))
const dateOf = (n: number) => night(n).toISOString().slice(0, 10)
const morning = (n: number) => new Date(Date.UTC(2026, 9, 7 + n, 5, 55))

function createApp(options: { enabled?: boolean; slack?: false | 'no_channel' } = {}) {
  const db = createTestD1()
  seedLibrary(db)
  // Only the rows of the test are owed a check.
  db.raw.exec('DELETE FROM external_namings')
  const market = createMarketplaces()
  const slack: { channel: string; text: string; blocks: { text: { text: string } }[] }[] = []
  const fetch = async (input: string, init?: RequestInit) => {
    if (String(input).startsWith('https://slack.com/')) {
      slack.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ ok: true }))
    }
    return market.fetch(input, init)
  }
  vi.stubGlobal('fetch', vi.fn(fetch))

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, USERS.admin as never)
    await next()
  })
  app.route('/api/namings', namings as never)
  const env = {
    DB: db,
    PANANAMES_SIGNATURE: '',
    PRICE_CHECK_ENABLED: options.enabled === false ? undefined : 'true',
    SLACK_BOT_TOKEN: options.slack === false ? '' : 'xoxb-test',
    SLACK_CHANNEL_PRICE_ALERTS: options.slack === undefined ? 'C_PRICES' : undefined,
  }

  const insert = db.raw.prepare(
    `INSERT INTO external_namings (id, name, domain, purchase_price, availability_status, domain_check_source, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'usr_admin', ?)`
  )
  return {
    db,
    env,
    market,
    slack,
    forSale(domain: string, price: number, createdAt = '2026-09-01 10:00:00') {
      insert.run(`exn_${domain}`, domain, domain, price, 'for_sale', 'admin_override', createdAt)
      market.listings.set(domain, { afternic: price, sedo: price, namecheap: price - 10 })
    },
    taken(domain: string) {
      insert.run(`exn_${domain}`, domain, domain, null, 'sold', 'pananames', '2026-09-01 10:00:00')
    },
    /** Every firing of the n-th night, until nobody is left to ask. */
    async wholeNight(n: number, firings = 10) {
      for (let i = 0; i < firings; i++) {
        const fired = await runPriceNight(env as never, { fetch: market.fetch, sleep: async () => {}, now: () => night(n) })
        if (fired.job === 'idle') return
      }
    },
    health: (n: number) => loadPriceHealth(db as never, dateOf(n)),
    report: (n: number) => reportPriceNight(env as never, morning(n)),
    prices() {
      return db.raw.prepare('SELECT domain, purchase_price, availability_status FROM external_namings ORDER BY domain').all()
    },
    get: (path: string) => app.request(path, {}, env),
  }
}

/** Four «For sale» domains every marketplace lists. */
function fourListed(app: ReturnType<typeof createApp>) {
  for (const [domain, price] of [['cashdisco.com', 7888], ['chamboo.com', 2695], ['darkmont.com', 2795], ['beepzy.com', 1995]] as const) {
    app.forSale(domain, price)
  }
}

d('the night that went well', () => {
  it('says nothing: no problem, no Slack message', async () => {
    const app = createApp()
    fourListed(app)
    app.taken('google.com')
    await app.wholeNight(0)

    expect(await app.health(0)).toEqual({ date: dateOf(0), due: 5, asked: 5, problems: [] })
    expect(await app.report(0)).toBe('ok')
    expect(app.slack).toEqual([])
  })
})

d('a marketplace that did not answer', () => {
  it.each<[string, (m: ReturnType<typeof createMarketplaces>, s: Marketplace) => void]>([
    ['refuses (403)', (m, s) => m.refusing.add(s)],
    ['is out of reach', (m, s) => m.unreachable.add(s)],
    ['answers with a page of another shape', (m, s) => m.garbled.add(s)],
  ])('%s: named with the date it last answered; the records stay as they were', async (_, breakIt) => {
    const app = createApp()
    fourListed(app)
    await app.wholeNight(0)
    const before = app.prices()

    breakIt(app.market, 'afternic')
    await app.wholeNight(1)

    const health = await app.health(1)
    expect(health.problems).toEqual([
      {
        kind: 'source_silent',
        source: 'afternic',
        text: 'Afternic не відповідає. Остання вдала перевірка — 07.10. Ціни з цього сайту не оновлюються.',
      },
    ])
    expect(app.prices()).toEqual(before)
  })

  it('one Slack message to the alerts channel, with the same sentence', async () => {
    const app = createApp()
    fourListed(app)
    await app.wholeNight(0)
    app.market.refusing.add('sedo')
    await app.wholeNight(1)

    expect(await app.report(1)).toBe('sent')
    expect(app.slack).toHaveLength(1)
    expect(app.slack[0].channel).toBe('C_PRICES')
    expect(app.slack[0].text).toBe('Ціни викупу доменів: перевірка 08.10 пройшла не повністю')
    expect(app.slack[0].blocks[0].text.text).toContain('• Sedo не відповідає. Остання вдала перевірка — 07.10.')
  })

  it.each([false, 'no_channel'] as const)('no bot token (the stage) or no channel — %s: nothing is sent, and the answer says so', async slack => {
    const app = createApp({ slack })
    fourListed(app)
    app.market.refusing.add('sedo')
    await app.wholeNight(0)

    expect(await app.report(0)).toBe('not_sent')
    expect(app.slack).toEqual([])
  })
})

d('a marketplace that answers and lists nothing', () => {
  it('while the others list the same domains — its page changed or it dropped the listings', async () => {
    const app = createApp()
    fourListed(app)
    for (const listing of app.market.listings.values()) delete listing.namecheap
    await app.wholeNight(0)

    expect((await app.health(0)).problems).toEqual([
      {
        kind: 'source_empty',
        source: 'namecheap',
        text: 'Namecheap не показує жодного оголошення, хоча на інших сайтах вони є. Можливо, сайт змінив формат сторінки.',
      },
    ])
  })

  it('domains nobody sells are no sign of it', async () => {
    const app = createApp()
    for (const domain of ['google.com', 'wikipedia.org', 'github.com', 'mozilla.org']) app.taken(domain)
    await app.wholeNight(0)
    expect((await app.health(0)).problems).toEqual([])
  })
})

d('a night that did not cover the list', () => {
  it('no firing at all: says when the last check was', async () => {
    const app = createApp()
    fourListed(app)
    await app.wholeNight(0)

    expect((await app.health(1)).problems).toEqual([
      { kind: 'night_missed', source: null, text: 'Нічна перевірка цін не запускалась. Остання перевірка — 07.10.' },
    ])
    expect(await app.report(1)).toBe('sent')
  })

  it('some firings only: says how many domains were left', async () => {
    const app = createApp()
    for (let i = 0; i < PRICE_RUN_MAX_DOMAINS + 3; i++) app.forSale(`s${i}.com`, 1000)
    await app.wholeNight(0, 1)

    expect((await app.health(0)).problems).toEqual([
      {
        kind: 'night_incomplete',
        source: null,
        text: `Цієї ночі перевірено не всі домени: 3 із ${PRICE_RUN_MAX_DOMAINS + 3} залишились без перевірки.`,
      },
    ])
  })

  it('a naming created after the night began is not owed a check until the next one', async () => {
    const app = createApp()
    fourListed(app)
    await app.wholeNight(0)
    app.forSale('hookmoon.com', 2995, `${dateOf(0)} 12:00:00`)

    expect(await app.health(0)).toMatchObject({ due: 4, asked: 4, problems: [] })
    expect((await app.health(1)).due).toBe(5)
  })
})

d('the schedule and the admin', () => {
  const fire = (env: unknown, scheduledTime: number) =>
    worker.scheduled({ cron: PRICE_NIGHT_CRON, scheduledTime } as never, env as never, { waitUntil() {} } as never)
  /** Today's firings: the handler stamps what it asks with the real clock. */
  const todayAt = (hours: number, minutes: number) => new Date().setUTCHours(hours, minutes, 0, 0)

  it('only the last firing of the night reports', async () => {
    const app = createApp()
    fourListed(app)
    app.market.refusing.add('afternic')

    await fire(app.env, todayAt(0, 0))
    await fire(app.env, todayAt(5, 50))
    expect(app.slack).toEqual([])

    await fire(app.env, todayAt(5, 55))
    expect(app.slack).toHaveLength(1)
    expect(app.slack[0].blocks[0].text.text).toContain('Afternic не відповідає.')
  })

  it('the switch is off: the last firing asks nobody and reports nothing', async () => {
    const app = createApp({ enabled: false })
    fourListed(app)
    await fire(app.env, todayAt(5, 55))
    expect(app.market.calls).toEqual([])
    expect(app.slack).toEqual([])
  })

  it('GET /external/price-health: what the line above the table shows; nothing while the check is off', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 7, 9, 0), toFake: ['Date'] })
    const app = createApp()
    fourListed(app)
    app.market.refusing.add('afternic')
    await app.wholeNight(0)

    const body = (await (await app.get('/api/namings/external/price-health')).json()) as { data: { date: string; problems: { kind: string }[] } }
    expect(body.data.date).toBe(dateOf(0))
    expect(body.data.problems.map(p => p.kind)).toEqual(['source_silent'])

    const off = createApp({ enabled: false })
    fourListed(off)
    expect(await (await off.get('/api/namings/external/price-health')).json()).toEqual({ success: true, data: null })
  })
})

describe('the rules of the summary', () => {
  const DATE = '2026-10-08'
  const row = (domain: string, source: string | null, outcome: string | null, attempted = `${DATE}T00:30:00.000Z`): HealthRow => ({
    domain,
    source,
    outcome,
    attempted_at: source ? attempted : null,
    read_at: outcome && outcome !== 'unread' ? attempted : null,
  })
  const all = (domain: string, afternic: string, sedo = 'listed', namecheap = 'listed') => [
    row(domain, 'afternic', afternic),
    row(domain, 'sedo', sedo),
    row(domain, 'namecheap', namecheap),
  ]

  it('fewer than half unread, or fewer than three, is a marketplace having a bad minute — not a problem', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].flatMap((n, i) => all(`${n}.com`, i < 3 ? 'unread' : 'listed'))
    expect(summarizePriceHealth(rows, DATE).problems).toEqual([])
    expect(summarizePriceHealth([...all('a.com', 'unread'), ...all('b.com', 'unread'), ...all('c.com', 'listed')], DATE).problems).toEqual([])
  })

  it('half or more unread, three at least: said with the numbers', () => {
    const rows = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((n, i) => all(`${n}.com`, i < 3 ? 'unread' : 'listed'))
    expect(summarizePriceHealth(rows, DATE).problems).toEqual([
      { kind: 'source_partial', source: 'afternic', text: 'Afternic відповів не на всі запити: 3 із 6 доменів не перевірено.' },
    ])
  })

  it('«lists nothing» needs three domains the others list: two prove nothing', () => {
    const two = [...all('a.com', 'absent'), ...all('b.com', 'absent'), ...all('c.com', 'absent', 'absent', 'absent')]
    expect(summarizePriceHealth(two, DATE).problems).toEqual([])
    const three = [...two, ...all('d.com', 'absent')]
    expect(summarizePriceHealth(three, DATE).problems.map(p => p.kind)).toEqual(['source_empty'])
  })

  it('a marketplace that lists even one domain is not «empty»', () => {
    const rows = [...all('a.com', 'absent'), ...all('b.com', 'absent'), ...all('c.com', 'absent'), ...all('d.com', 'listed')]
    expect(summarizePriceHealth(rows, DATE).problems).toEqual([])
  })

  it('two namings on one domain are one domain', () => {
    const rows = [...all('a.com', 'listed'), ...all('A.com ', 'listed'), row('b.com', null, null)]
    expect(summarizePriceHealth(rows, DATE)).toMatchObject({ due: 2, asked: 1 })
  })

  it('what is typed in the domain field and is no domain is not owed a check — the night skips it too', () => {
    const rows = [...all('a.com', 'listed'), row('com', null, null), row('just a word', null, null)]
    expect(summarizePriceHealth(rows, DATE)).toEqual({ date: DATE, due: 1, asked: 1, problems: [] })
  })

  it('nothing owed — nothing to say; never asked at all — said plainly', () => {
    expect(summarizePriceHealth([], DATE).problems).toEqual([])
    expect(summarizePriceHealth([row('a.com', null, null)], DATE).problems).toEqual([
      { kind: 'night_missed', source: null, text: 'Нічна перевірка цін ще не запускалась.' },
    ])
  })

  it('before 06:00 UTC the night in question is yesterday’s — tonight’s is still going', () => {
    expect(nightDateOf(new Date(Date.UTC(2026, 9, 8, 5, 59)))).toBe('2026-10-07')
    expect(nightDateOf(new Date(Date.UTC(2026, 9, 8, 6, 0)))).toBe('2026-10-08')
    // A domain asked about tonight already counts for it.
    const rows = [...all('a.com', 'listed', 'listed', 'listed')]
    expect(summarizePriceHealth(rows, '2026-10-07')).toMatchObject({ asked: 1, problems: [] })
  })

  it('the last firing is 05:55 UTC and no other', () => {
    expect(isLastFiringOfNight(Date.UTC(2026, 9, 8, 5, 55))).toBe(true)
    expect(isLastFiringOfNight(Date.UTC(2026, 9, 8, 5, 50))).toBe(false)
    expect(isLastFiringOfNight(Date.UTC(2026, 9, 8, 0, 55))).toBe(false)
  })

  it('the Slack message carries every problem and says the records did not change', () => {
    const health = summarizePriceHealth(
      [...['a', 'b', 'c'].flatMap(n => all(`${n}.com`, 'unread', 'listed', 'absent')), row('d.com', null, null)],
      DATE
    )
    const text = buildPriceHealthMessage('C1', health).blocks.map(b => b.text.text).join('\n')
    for (const problem of health.problems) expect(text).toContain(problem.text)
    expect(health.problems.map(p => p.kind)).toEqual(['night_incomplete', 'source_silent', 'source_empty'])
    expect(text).toContain('Ціни й статуси в записах не змінювались.')
  })
})
