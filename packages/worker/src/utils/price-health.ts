// Did the night's price check reach the marketplaces
// (docs/architecture/domain-price-sync-plan.md, «Сбой сайта»). A marketplace
// that stops answering changes nothing in the records — that is the point of
// «не прочитано» — and so nobody learnt of it: the owner, 08.10: «мы даже не
// узнаем, что сайт не работает». Two ways out of here: a line above the
// namings table and one Slack message after the night, both only when
// something is wrong.
//
// Nothing is stored for it. `naming_price_checks` keeps the last attempt at
// every marketplace for every naming, and that is enough to tell:
//
//   night_missed     — no domain was asked about this night
//   night_incomplete — some were not (the list outgrew the night)
//   source_silent    — a marketplace answered about none of its domains
//   source_partial   — … about fewer than half
//   source_empty     — it answers, lists nothing, and the others list the same
//                      domains: its page changed, or it dropped the listings
//
// The last one is the control: not one domain picked for the purpose — that
// one could be sold any day — but every domain the others still list.

import type { NamingPriceHealth, NamingPriceHealthProblem, NamingPriceSource } from '@brand-constructor/shared'
import type { Env } from '../types'
import { DISCOVERABLE_ROWS, FOR_SALE_ROWS } from './price-check'
import { readDynadot } from './price-dynadot'
import { PRICE_SOURCES, normalizeDomain } from './price-sources'
import { sendSlackMessage } from './slack'

const LABELS: Record<NamingPriceSource, string> = { afternic: 'Afternic', sedo: 'Sedo', namecheap: 'Namecheap' }

/** Fewer answers than this and a marketplace is not judged by them. */
const MIN_TO_JUDGE = 3

/** One marketplace's last attempt at one naming; a naming never asked about comes with nulls. */
export interface HealthRow {
  domain: string
  source: string | null
  outcome: string | null
  attempted_at: string | null
  read_at: string | null
}

/** «06.10» of an ISO date or timestamp. */
function uaDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
}

function isSource(value: string | null): value is NamingPriceSource {
  return (PRICE_SOURCES as readonly string[]).includes(value ?? '')
}

/**
 * The night the question is about. The schedule runs 00:00–05:55 UTC, so
 * before 06:00 the night of this date is still going and the last whole one is
 * yesterday's. A domain asked about since counts for it all the same.
 */
export function nightDateOf(now: Date): string {
  const night = new Date(now)
  if (night.getUTCHours() < 6) night.setUTCDate(night.getUTCDate() - 1)
  return night.toISOString().slice(0, 10)
}

/** `rows` — every domain the night owes a check, with what is stored about it. */
export function summarizePriceHealth(rows: HealthRow[], date: string): NamingPriceHealth {
  const since = (at: string | null) => at != null && at.slice(0, 10) >= date
  // Two namings may share a domain: it is asked about once.
  const domains = new Map<string, Map<NamingPriceSource, HealthRow>>()
  const lastRead = new Map<NamingPriceSource, string>()
  let lastAttempt: string | null = null

  for (const row of rows) {
    // What is no domain («com», a word) the night never asks about — and owes nothing.
    const key = normalizeDomain(row.domain)
    if (!key) continue
    const readings = domains.get(key) ?? new Map<NamingPriceSource, HealthRow>()
    domains.set(key, readings)
    if (!isSource(row.source)) continue
    const kept = readings.get(row.source)
    if (!kept || (row.attempted_at ?? '') > (kept.attempted_at ?? '')) readings.set(row.source, row)
    if (row.read_at != null && row.read_at > (lastRead.get(row.source) ?? '')) lastRead.set(row.source, row.read_at)
    if (row.attempted_at != null && (lastAttempt == null || row.attempted_at > lastAttempt)) lastAttempt = row.attempted_at
  }

  const asked = [...domains.values()].filter(readings => [...readings.values()].some(r => since(r.attempted_at)))
  const health: NamingPriceHealth = { date, due: domains.size, asked: asked.length, problems: [] }
  const problem = (p: NamingPriceHealthProblem) => void health.problems.push(p)

  if (health.due === 0) return health
  if (health.asked === 0) {
    problem({
      kind: 'night_missed',
      source: null,
      text: lastAttempt
        ? `Нічна перевірка цін не запускалась. Остання перевірка — ${uaDate(lastAttempt)}.`
        : 'Нічна перевірка цін ще не запускалась.',
    })
    return health
  }
  if (health.asked < health.due) {
    problem({
      kind: 'night_incomplete',
      source: null,
      text: `Цієї ночі перевірено не всі домени: ${health.due - health.asked} із ${health.due} залишились без перевірки.`,
    })
  }

  for (const source of PRICE_SOURCES) {
    let tried = 0
    let unread = 0
    let listed = 0
    let listedElsewhere = 0
    for (const readings of asked) {
      const mine = readings.get(source)
      if (!mine || !since(mine.attempted_at)) continue
      tried++
      if (mine.outcome === 'unread') {
        unread++
        continue
      }
      if (mine.outcome === 'listed') listed++
      else if ([...readings.values()].some(r => r.source !== source && since(r.attempted_at) && r.outcome === 'listed')) {
        listedElsewhere++
      }
    }
    const label = LABELS[source]
    const read = lastRead.get(source)

    if (tried > 0 && unread === tried) {
      problem({
        kind: 'source_silent',
        source,
        text: `${label} не відповідає.${read ? ` Остання вдала перевірка — ${uaDate(read)}.` : ''} Ціни з цього сайту не оновлюються.`,
      })
    } else if (unread >= MIN_TO_JUDGE && unread * 2 >= tried) {
      problem({
        kind: 'source_partial',
        source,
        text: `${label} відповів не на всі запити: ${unread} із ${tried} доменів не перевірено.`,
      })
    } else if (tried - unread >= MIN_TO_JUDGE && listed === 0 && listedElsewhere >= MIN_TO_JUDGE) {
      problem({
        kind: 'source_empty',
        source,
        text: `${label} не показує жодного оголошення, хоча на інших сайтах вони є. Можливо, сайт змінив формат сторінки.`,
      })
    }
  }
  return health
}

/** The domains the night owes a check: created before it began, «For sale» or taken and unmarked. */
export async function loadPriceHealth(db: D1Database, date: string): Promise<NamingPriceHealth> {
  const { results } = await db
    .prepare(
      `SELECT en.domain, pc.source, pc.outcome, pc.attempted_at, pc.read_at
       FROM external_namings en
       LEFT JOIN naming_price_checks pc ON pc.naming_id = en.id
       WHERE en.domain IS NOT NULL AND en.domain != '' AND en.created_at < ?
         AND ((${FOR_SALE_ROWS}) OR (${DISCOVERABLE_ROWS}))`
    )
    .bind(date)
    .all<HealthRow>()
  return summarizePriceHealth(results, date)
}

// ── Slack: one message after the night, and only when something is wrong ────

export function buildPriceHealthMessage(channel: string, health: NamingPriceHealth) {
  const title = `Ціни викупу доменів: перевірка ${uaDate(health.date)} пройшла не повністю`
  return {
    channel,
    text: title,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*${title}*\n${health.problems.map(p => `• ${p.text}`).join('\n')}` } },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'Ціни й статуси в записах не змінювались. Подробиці — адмінка, «Неймінги».' },
      },
    ],
  }
}

/** The schedule's last firing of the night: 05:55 UTC (`PRICE_NIGHT_CRON`). */
export function isLastFiringOfNight(scheduledTime: number): boolean {
  const at = new Date(scheduledTime)
  return at.getUTCHours() === 5 && at.getUTCMinutes() === 55
}

export type PriceNightReport = 'ok' | 'sent' | 'not_sent'

/**
 * With a key the night goes through Dynadot, and when it is silent the prices
 * still come — from the marketplaces' own addresses. So no record and no
 * reading shows it; it is asked once here. For the people who keep the tool,
 * not for the namings table: there nothing is wrong.
 */
async function dynadotProblem(env: Pick<Env, 'DB' | 'DYNADOT_API_KEY'>): Promise<NamingPriceHealthProblem | null> {
  if (!env.DYNADOT_API_KEY) return null
  const { results } = await env.DB.prepare(
    `SELECT en.domain FROM external_namings en WHERE en.domain IS NOT NULL AND en.domain != '' AND ${FOR_SALE_ROWS} LIMIT 20`
  ).all<{ domain: string }>()
  const domain = results.map(r => normalizeDomain(r.domain)).find(d => d != null)
  if (!domain) return null

  const silent: string[] = []
  for (const source of ['afternic', 'sedo'] as const) {
    if (!(await readDynadot(source, domain, env.DYNADOT_API_KEY, fetch))) silent.push(LABELS[source])
  }
  if (silent.length === 0) return null
  return {
    kind: 'dynadot_silent',
    source: null,
    text: `Dynadot не відповідає щодо ${silent.join(' і ')}. Ціни читаються напряму з сайтів, як раніше.`,
  }
}

/**
 * `not_sent` — there is something to say and nowhere to: no bot token (the
 * stage has none) or no SLACK_CHANNEL_PRICE_ALERTS. The server log has it.
 */
export async function reportPriceNight(
  env: Pick<Env, 'DB' | 'SLACK_BOT_TOKEN' | 'SLACK_CHANNEL_PRICE_ALERTS' | 'DYNADOT_API_KEY'>,
  now: Date
): Promise<PriceNightReport> {
  const health = await loadPriceHealth(env.DB, now.toISOString().slice(0, 10))
  const dynadot = await dynadotProblem(env)
  if (dynadot) health.problems.push(dynadot)
  if (health.problems.length === 0) return 'ok'
  console.warn('Price night problems:', JSON.stringify(health))
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_PRICE_ALERTS) return 'not_sent'
  const sent = await sendSlackMessage(env.SLACK_BOT_TOKEN, buildPriceHealthMessage(env.SLACK_CHANNEL_PRICE_ALERTS, health))
  return sent ? 'sent' : 'not_sent'
}
