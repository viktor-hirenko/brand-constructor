// The price check of «For sale» domains: asks the marketplaces, hands the
// answers to the rules (`price-check-rules.ts`) and writes what they decide
// (docs/architecture/domain-price-sync-plan.md). Three ways in:
//
//   every night — every «For sale» domain: its price, or that it is gone;
//                 then every taken domain nobody marked: is it for sale now
//   one row     — on a save in the admin and from «Перевірити зараз»
//
// The night is not one run but as many as the list needs: the schedule fires
// every five minutes, a firing takes the next domains not asked about today,
// and once none is left it asks nobody (`runPriceNight`).

import type { NamingPriceCheck, NamingPriceSource, NamingPriceSourceReading } from '@brand-constructor/shared'
import type { Env } from '../types'
import { checkDomainAvailability, isPananamesConfigured, updateNamingDomainStatus } from './domain-check'
import { resolveAvailabilityChange } from './naming-availability'
import {
  PRICE_STATE_RESET,
  applyPriceReadings,
  describePriceCheck,
  isDiscoverableRow,
  isForSaleRow,
  isPriceAuto,
  type PriceCheckChange,
  type PriceFields,
  type PriceRow,
  type StoredReading,
} from './price-check-rules'
import {
  normalizeDomain,
  readAfternic,
  readNamecheap,
  readSedo,
  unread,
  type FetchLike,
  type SourceReading,
} from './price-sources'

/**
 * The schedule entry of the night in `wrangler.toml`: every five minutes from
 * 00:00 to 05:55 UTC — 72 runs, all on one UTC date, since the rules count
 * dates (a price read «on two dates», no listing «on three»). A run of
 * `PRICE_RUN_MAX_DOMAINS` takes well under five minutes even when every
 * request waits out its timeout, so two runs never overlap.
 */
export const PRICE_NIGHT_CRON = '*/5 0-5 * * *'

/**
 * Domains per run. One run is one request to Namecheap and two per domain,
 * and the smallest Cloudflare plan allows 50 requests out per run, the
 * database included. The limit is on a run, not on the night: the next run
 * takes the next domains.
 */
export const PRICE_RUN_MAX_DOMAINS = 20

/** Between two domains, so no marketplace gets more than a request a second. */
const PAUSE_MS = 1000

/** The recheck button asks the marketplaces for a row at most this often. */
const RECHECK_AFTER_MS = 60 * 60 * 1000

export function isPriceCheckEnabled(env: Pick<Env, 'PRICE_CHECK_ENABLED'>): boolean {
  return env.PRICE_CHECK_ENABLED === 'true'
}

export interface PriceCheckDeps {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
}

interface CheckRow extends PriceRow {
  id: string
  domain: string | null
  price: number | null
}

const ROW_COLUMNS = `en.id, en.domain, en.price, en.status, en.availability_status, en.domain_check_source,
  en.purchase_price, en.price_source, en.price_synced, en.price_prev, en.price_updated_at,
  en.price_absent_nights, en.price_absent_date, en.price_delisted_at,
  en.price_dismissed_source, en.price_dismissed_amount`

interface ReadingRecord {
  naming_id: string
  source: StoredReading['source']
  outcome: StoredReading['outcome']
  amount: number | null
  currency: string | null
  min_offer: number | null
  url: string | null
  attempted_at: string
  read_at: string | null
  pending_amount: number | null
  pending_date: string | null
}

function toStored(r: ReadingRecord): StoredReading {
  return {
    source: r.source,
    outcome: r.outcome,
    amount: r.amount,
    currency: r.currency,
    minOffer: r.min_offer,
    url: r.url,
    attemptedAt: r.attempted_at,
    readAt: r.read_at,
    pendingAmount: r.pending_amount,
    pendingDate: r.pending_date,
  }
}

/** Every stored reading by naming, or one naming's. */
export async function loadPriceReadings(db: D1Database, namingId?: string): Promise<Map<string, StoredReading[]>> {
  const statement = namingId
    ? db.prepare('SELECT * FROM naming_price_checks WHERE naming_id = ?').bind(namingId)
    : db.prepare('SELECT * FROM naming_price_checks')
  const { results } = await statement.all<ReadingRecord>()
  const out = new Map<string, StoredReading[]>()
  for (const record of results) {
    const list = out.get(record.naming_id)
    if (list) list.push(toStored(record))
    else out.set(record.naming_id, [toStored(record)])
  }
  return out
}

/**
 * List rows with what the price check knows: `price_check` for the admin's
 * card, `price_auto` — whether the price is a marketplace's or a person's.
 */
export async function withPriceChecks<T extends Record<string, unknown>>(
  db: D1Database,
  rows: T[]
): Promise<(T & { price_check: NamingPriceCheck | null; price_auto: boolean })[]> {
  const typed = rows as unknown as (T & PriceRow & { id: string })[]
  const needsReadings = typed.some(row => isForSaleRow(row) || isDiscoverableRow(row))
  const readings = needsReadings ? await loadPriceReadings(db) : new Map<string, StoredReading[]>()
  return typed.map(row => {
    const stored = readings.get(row.id) ?? []
    return { ...row, price_check: describePriceCheck(row, stored), price_auto: isPriceAuto(row, stored) }
  })
}

// ── Writing ─────────────────────────────────────────────────────────────────

function setClause(fields: Record<string, string | number | null>): { sql: string; values: (string | number | null)[] } {
  const keys = Object.keys(fields)
  return { sql: keys.map(k => `${k} = ?`).join(', '), values: keys.map(k => fields[k]) }
}

/**
 * Every write to the naming is conditional on the row still being the one the
 * rules saw — «For sale», not used in a brand, the same price: a save by a
 * person in the meantime wins, and the next check starts from it.
 */
const UNCHANGED = `id = ? AND status = 'active' AND domain_check_source = 'admin_override' AND purchase_price = ?`

/** A taken domain still nobody marked — the row the rules put «For sale» on. */
const STILL_TAKEN = `id = ? AND status = 'active' AND domain_check_source != 'admin_override'
  AND COALESCE(availability_status, 'unknown') IN ('sold', 'unknown')`

function statementsFor(db: D1Database, row: CheckRow, change: PriceCheckChange): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = []
  const record = row.purchase_price

  if (change.delist) {
    // The same path as a person choosing «Автоматично» in the edit modal.
    const back = resolveAvailabilityChange({ domain_check_source: 'manual' }, row)
    if ('error' in back || record == null) return []
    const set = setClause({ ...back.fields, ...change.fields })
    statements.push(
      db
        .prepare(`UPDATE external_namings SET ${set.sql}, updated_at = datetime('now') WHERE ${UNCHANGED}`)
        .bind(...set.values, row.id, record),
      db
        .prepare(
          `DELETE FROM naming_price_checks WHERE naming_id = ?
             AND EXISTS (SELECT 1 FROM external_namings WHERE id = ? AND domain_check_source != 'admin_override')`
        )
        .bind(row.id, row.id)
    )
    return statements
  }

  for (const r of change.readings) {
    statements.push(
      db
        .prepare(
          `INSERT INTO naming_price_checks
             (naming_id, source, outcome, amount, currency, min_offer, url, attempted_at, read_at, pending_amount, pending_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (naming_id, source) DO UPDATE SET
             outcome = excluded.outcome, amount = excluded.amount, currency = excluded.currency,
             min_offer = excluded.min_offer, url = excluded.url, attempted_at = excluded.attempted_at,
             read_at = excluded.read_at, pending_amount = excluded.pending_amount, pending_date = excluded.pending_date`
        )
        .bind(
          row.id,
          r.source,
          r.outcome,
          r.amount,
          r.currency,
          r.minOffer,
          r.url,
          r.attemptedAt,
          r.readAt,
          r.pendingAmount,
          r.pendingDate
        )
    )
  }

  const fields = change.fields as Record<string, string | number | null>
  if (change.list) {
    // Stored the way a person's «For sale» is, so the registrar's nightly
    // check, the wizard and the brief read it as they always did.
    const set = setClause({ availability_status: 'for_sale', domain_check_source: 'admin_override', price: null, ...fields })
    statements.push(
      db
        .prepare(`UPDATE external_namings SET ${set.sql}, updated_at = datetime('now') WHERE ${STILL_TAKEN}`)
        .bind(...set.values, row.id)
    )
  } else if (Object.keys(fields).length > 0 && record != null) {
    const set = setClause(fields)
    const touch = 'purchase_price' in fields ? `, updated_at = datetime('now')` : ''
    statements.push(
      db.prepare(`UPDATE external_namings SET ${set.sql}${touch} WHERE ${UNCHANGED}`).bind(...set.values, row.id, record)
    )
  }
  return statements
}

/** Off «For sale» → the registrar says Available or Sold, as after a manual switch. */
async function recheckAtRegistrar(env: Env, row: CheckRow): Promise<void> {
  if (!row.domain || !isPananamesConfigured(env)) return
  const result = await checkDomainAvailability(row.domain, env)
  if (result) await updateNamingDomainStatus(env.DB, row.id, result)
}

// ── A domain being typed: what the marketplaces say, nothing written ────────

export interface PricePreview {
  sources: NamingPriceSourceReading[]
  /** The price a save would put on the domain if it is taken: the first fixed USD one. */
  price: number | null
  source: NamingPriceSource | null
}

/** A taken domain nobody marked — the row a save of a new domain makes. */
const PREVIEW_ROW: PriceRow = {
  status: 'active',
  availability_status: 'unknown',
  domain_check_source: 'manual',
  purchase_price: null,
  ...PRICE_STATE_RESET,
}

/**
 * The create and edit windows show the three marketplaces' prices the moment a
 * domain is typed: the owner looked for them there, not in a card behind the
 * table (08.10). The price is decided by the same rule the save runs.
 */
export async function previewDomainPrice(rawDomain: string, deps: PriceCheckDeps = {}): Promise<PricePreview | null> {
  const domain = normalizeDomain(rawDomain)
  if (!domain) return null
  const fetcher = deps.fetch ?? fetch
  const now = (deps.now ?? (() => new Date()))()

  const [afternic, sedo, namecheap] = await Promise.all([
    readAfternic(domain, fetcher),
    readSedo(domain, fetcher),
    readNamecheap([domain], fetcher),
  ])
  const fresh = [afternic.reading, sedo.reading, namecheap.readings.get(domain) ?? unread('namecheap', domain, 'no answer')]
  const change = applyPriceReadings(PREVIEW_ROW, [], fresh, now)
  return {
    sources: change.readings.map(r => ({
      source: r.source,
      outcome: r.outcome,
      amount: r.amount,
      currency: r.currency,
      min_offer: r.minOffer,
      url: r.url,
      read_at: r.readAt,
    })),
    price: change.list ? (change.fields.purchase_price ?? null) : null,
    source: change.list ? ((change.fields.price_source as NamingPriceSource | null | undefined) ?? null) : null,
  }
}

// ── One row: the recheck button ─────────────────────────────────────────────

export type CheckNamingPriceResult = 'not_found' | 'not_for_sale' | 'used' | 'cached' | 'checked'

export async function checkNamingPrice(env: Env, namingId: string, deps: PriceCheckDeps = {}): Promise<CheckNamingPriceResult> {
  const fetcher = deps.fetch ?? fetch
  const now = (deps.now ?? (() => new Date()))()

  const row = await env.DB.prepare(`SELECT ${ROW_COLUMNS} FROM external_namings en WHERE en.id = ?`)
    .bind(namingId)
    .first<CheckRow>()
  if (!row) return 'not_found'
  const domain = normalizeDomain(row.domain)
  if (!domain) return 'not_for_sale'
  if (isForSaleRow(row) && row.status !== 'active') return 'used'
  if (!isForSaleRow(row) && !isDiscoverableRow(row)) return 'not_for_sale'

  const stored = (await loadPriceReadings(env.DB, namingId)).get(namingId) ?? []
  const lastAttempt = stored.reduce<string | null>((max, r) => (max == null || r.attemptedAt > max ? r.attemptedAt : max), null)
  if (lastAttempt && now.getTime() - new Date(lastAttempt).getTime() < RECHECK_AFTER_MS) return 'cached'

  const [afternic, sedo, namecheap] = await Promise.all([
    readAfternic(domain, fetcher),
    readSedo(domain, fetcher),
    readNamecheap([domain], fetcher),
  ])
  const fresh = [afternic.reading, sedo.reading, namecheap.readings.get(domain) ?? unread('namecheap', domain, 'no answer')]

  const change = applyPriceReadings(row, stored, fresh, now)
  const statements = statementsFor(env.DB, row, change)
  if (statements.length > 0) await env.DB.batch(statements)
  if (change.delist) await recheckAtRegistrar(env, row)
  return 'checked'
}

// ── Every row: the night ────────────────────────────────────────────────────

type QueuedRow = CheckRow & { last_attempt: string | null }

/**
 * Rows of one kind that no marketplace was asked about today, the longest
 * unasked first. An unread attempt counts as asked: a marketplace that refused
 * is not tried again for the same domain the same night.
 */
function notAskedToday(db: D1Database, where: string, today: string): Promise<D1Result<QueuedRow>> {
  return db
    .prepare(
      `SELECT * FROM (
         SELECT ${ROW_COLUMNS},
                (SELECT MIN(pc.attempted_at) FROM naming_price_checks pc WHERE pc.naming_id = en.id) AS last_attempt
         FROM external_namings en
         WHERE en.domain IS NOT NULL AND en.domain != '' AND ${where}
       )
       WHERE last_attempt IS NULL OR last_attempt < ?
       ORDER BY last_attempt IS NOT NULL, last_attempt ASC, id`
    )
    .bind(today)
    .all<QueuedRow>()
}

interface RunBatch {
  rowsByDomain: Map<string, CheckRow[]>
  /** Domains left for the next run by the per-run limit. */
  postponed: number
}

/** The first `PRICE_RUN_MAX_DOMAINS` domains of the queue, with every naming on them. */
function takeBatch(rows: CheckRow[]): RunBatch {
  const rowsByDomain = new Map<string, CheckRow[]>()
  const left = new Set<string>()
  for (const row of rows) {
    const domain = normalizeDomain(row.domain)
    if (!domain) continue
    const taken = rowsByDomain.get(domain)
    if (taken) taken.push(row)
    else if (rowsByDomain.size < PRICE_RUN_MAX_DOMAINS) rowsByDomain.set(domain, [row])
    else left.add(domain)
  }
  return { rowsByDomain, postponed: left.size }
}

interface Asked {
  freshByDomain: Map<string, SourceReading[]>
  refused: string[]
  unread: Record<string, number>
}

/** One request to Namecheap for the batch, then Afternic and Sedo domain by domain. */
async function askMarketplaces(domains: string[], deps: PriceCheckDeps): Promise<Asked> {
  const fetcher = deps.fetch ?? fetch
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const unreadCount: Record<string, number> = { afternic: 0, sedo: 0, namecheap: 0 }

  const refused = new Set<string>()
  const namecheap = await readNamecheap(domains, fetcher)
  if (namecheap.refused) refused.add('namecheap')

  const freshByDomain = new Map<string, SourceReading[]>()
  for (const [index, domain] of domains.entries()) {
    if (index > 0) await sleep(PAUSE_MS)
    // A refusal ends the run for that marketplace: no retries, no way round.
    const ask = async (source: 'afternic' | 'sedo', read: typeof readAfternic) => {
      if (refused.has(source)) return unread(source, domain, 'skipped after a refusal')
      const answer = await read(domain, fetcher)
      if (answer.refused) refused.add(source)
      return answer.reading
    }
    const [afternic, sedo] = await Promise.all([ask('afternic', readAfternic), ask('sedo', readSedo)])
    const fresh = [afternic, sedo, namecheap.readings.get(domain) ?? unread('namecheap', domain, 'no answer')]
    for (const reading of fresh) if (reading.outcome === 'unread') unreadCount[reading.source]++
    freshByDomain.set(domain, fresh)
  }
  return { freshByDomain, refused: [...refused], unread: unreadCount }
}

export interface PriceCheckSummary {
  namings: number
  domains: number
  /** Domains left for the next run by the per-run limit. */
  postponed: number
  updated: number
  delisted: number
  refused: string[]
  unread: Record<string, number>
}

/** One run over «For sale» domains: the next ones not asked about today. */
export async function runPriceCheck(env: Env, deps: PriceCheckDeps = {}): Promise<PriceCheckSummary> {
  const now = (deps.now ?? (() => new Date()))()

  // Used namings are read too — for the line in the table only (rule 8).
  const { results } = await notAskedToday(
    env.DB,
    `en.availability_status = 'for_sale' AND en.domain_check_source = 'admin_override' AND en.status IN ('active', 'used')`,
    now.toISOString().slice(0, 10)
  )
  const { rowsByDomain, postponed } = takeBatch(results)
  const domains = [...rowsByDomain.keys()]
  const summary: PriceCheckSummary = {
    namings: 0,
    domains: domains.length,
    postponed,
    updated: 0,
    delisted: 0,
    refused: [],
    unread: { afternic: 0, sedo: 0, namecheap: 0 },
  }
  if (domains.length === 0) return summary

  const asked = await askMarketplaces(domains, deps)
  summary.refused = asked.refused
  summary.unread = asked.unread

  const stored = await loadPriceReadings(env.DB)
  const statements: D1PreparedStatement[] = []
  const delisted: CheckRow[] = []
  for (const [domain, rows] of rowsByDomain) {
    for (const row of rows) {
      const change = applyPriceReadings(row, stored.get(row.id) ?? [], asked.freshByDomain.get(domain) ?? [], now)
      statements.push(...statementsFor(env.DB, row, change))
      summary.namings++
      if (change.delist) delisted.push(row)
      else if ('purchase_price' in change.fields) summary.updated++
    }
  }
  if (statements.length > 0) await env.DB.batch(statements)
  for (const row of delisted) await recheckAtRegistrar(env, row)
  summary.delisted = delisted.length
  return summary
}

// ── Taken domains: is one of them for sale now ──────────────────────────────

export interface PriceDiscoverySummary {
  namings: number
  domains: number
  /** Domains left for the next run by the per-run limit. */
  postponed: number
  listed: number
  refused: string[]
}

/** One run over taken domains nobody marked: the next ones not asked about today. */
export async function runPriceDiscovery(env: Env, deps: PriceCheckDeps = {}): Promise<PriceDiscoverySummary> {
  const now = (deps.now ?? (() => new Date()))()

  const { results } = await notAskedToday(
    env.DB,
    `en.status = 'active' AND en.domain_check_source != 'admin_override'
       AND COALESCE(en.availability_status, 'unknown') IN ('sold', 'unknown')`,
    now.toISOString().slice(0, 10)
  )
  const { rowsByDomain, postponed } = takeBatch(results)
  const domains = [...rowsByDomain.keys()]
  const summary: PriceDiscoverySummary = { namings: 0, domains: domains.length, postponed, listed: 0, refused: [] }
  if (domains.length === 0) return summary

  const asked = await askMarketplaces(domains, deps)
  summary.refused = asked.refused

  const stored = await loadPriceReadings(env.DB)
  const statements: D1PreparedStatement[] = []
  for (const [domain, rows] of rowsByDomain) {
    for (const row of rows) {
      const change = applyPriceReadings(row, stored.get(row.id) ?? [], asked.freshByDomain.get(domain) ?? [], now)
      statements.push(...statementsFor(env.DB, row, change))
      summary.namings++
      if (change.list) summary.listed++
    }
  }
  if (statements.length > 0) await env.DB.batch(statements)
  return summary
}

// ── The night: one firing of the schedule ───────────────────────────────────

export type PriceNightSummary =
  | { job: 'check'; summary: PriceCheckSummary }
  | { job: 'discovery'; summary: PriceDiscoverySummary }
  | { job: 'idle' }

/**
 * «For sale» domains first; once every one of them was asked about today, the
 * taken ones; once those too — nothing, and no marketplace hears from us.
 * One firing does one of the two, so it stays inside a run's allowance.
 */
export async function runPriceNight(env: Env, deps: PriceCheckDeps = {}): Promise<PriceNightSummary> {
  const check = await runPriceCheck(env, deps)
  if (check.domains > 0) return { job: 'check', summary: check }
  const discovery = await runPriceDiscovery(env, deps)
  return discovery.domains > 0 ? { job: 'discovery', summary: discovery } : { job: 'idle' }
}

// ── A person's save ─────────────────────────────────────────────────────────

interface SavedValues {
  domain: string | null
  purchase_price: number | null
  domain_check_source: string | null
}

/**
 * What a save in the admin does to the price check's state. A new domain or a
 * new choice between Automatic and For sale starts it over, readings included
 * (rule 10: a price of another domain never reaches the record). A new price
 * only drops what was said about the old one — the lead ends by itself, since
 * the price no longer equals the one the marketplace had (rule 9).
 */
export function priceCheckChangeOnSave(
  before: SavedValues,
  after: SavedValues
): { fields: PriceFields; readings: 'keep' | 'clear_pending' | 'delete' } {
  const wasForSale = before.domain_check_source === 'admin_override'
  const isForSale = after.domain_check_source === 'admin_override'
  if (normalizeDomain(before.domain) !== normalizeDomain(after.domain) || wasForSale !== isForSale) {
    return { fields: PRICE_STATE_RESET, readings: 'delete' }
  }
  if (isForSale && before.purchase_price !== after.purchase_price) {
    return {
      fields: {
        price_prev: null,
        price_updated_at: null,
        price_absent_nights: 0,
        price_absent_date: null,
        price_dismissed_source: null,
        price_dismissed_amount: null,
      },
      readings: 'clear_pending',
    }
  }
  return { fields: {}, readings: 'keep' }
}
