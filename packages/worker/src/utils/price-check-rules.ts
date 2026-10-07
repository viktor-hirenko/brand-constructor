// What the price check may change in a «For sale» naming and what it only
// shows (docs/architecture/domain-price-sync-plan.md, «Правила автоматики»).
// Pure: a row, the marketplaces' readings and the time in — changes and the
// line for the admin table out. Reading and writing are in `price-check.ts`.
//
// One notion carries it all. A marketplace LEADS a row when the price in the
// record is the price that marketplace had when the two were last equal
// (`purchase_price = price_synced`). A price a person typed that no
// marketplace has leads nowhere, and automation leaves such a row alone.
//
//   1  only a led row is changed
//   2  its price follows the leading marketplace only
//   3  a new price is written after it was read on two different dates
//   4  more than twice up or down is not written — a person decides
//   5  no listing anywhere on three dates in a row takes «For sale» off
//   6  an unread marketplace is no «no listing» and restarts that count
//   7  zero or nothing is never a price (the readers return no such reading)
//   8  a naming used in an approved brand is never changed
//   9  a person's edit ends the lead until the price equals a marketplace again
//  11  an automatic change keeps what the price was, when, and the marketplace
//
// The other direction (07.10, after the owner saw the stage): a taken domain
// nobody marked is put «For sale» by the check itself, with the marketplace's
// price, the moment a marketplace lists it at a fixed USD price. Such a row is
// led from the start, so everything above applies to it at once.

import type { NamingPriceCheck, NamingPriceSource } from '@brand-constructor/shared'
import { PRICE_SOURCES, type SourceReading } from './price-sources'

export interface StoredReading extends Omit<SourceReading, 'note'> {
  attemptedAt: string
  readAt: string | null
  pendingAmount: number | null
  pendingDate: string | null
}

/** The columns of `external_namings` the rules read. */
export interface PriceRow {
  status: string
  availability_status: string | null
  domain_check_source: string | null
  purchase_price: number | null
  price_source: string | null
  price_synced: number | null
  price_prev: number | null
  price_updated_at: string | null
  price_absent_nights: number
  price_absent_date: string | null
  price_delisted_at: string | null
  price_dismissed_source: string | null
  price_dismissed_amount: number | null
}

export type PriceFields = Partial<Omit<PriceRow, 'status' | 'availability_status' | 'domain_check_source'>>

/** A row the price check knows nothing about: a new domain, a new status. */
export const PRICE_STATE_RESET = {
  price_source: null,
  price_synced: null,
  price_prev: null,
  price_updated_at: null,
  price_absent_nights: 0,
  price_absent_date: null,
  price_delisted_at: null,
  price_dismissed_source: null,
  price_dismissed_amount: null,
} satisfies PriceFields

export const ABSENT_NIGHTS_TO_DELIST = 3
export const JUMP_FACTOR = 2

export function sameAmount(a: number | null | undefined, b: number | null | undefined): boolean {
  return a != null && b != null && Math.abs(a - b) < 0.005
}

export function isForSaleRow(row: Pick<PriceRow, 'availability_status' | 'domain_check_source'>): boolean {
  return row.availability_status === 'for_sale' && row.domain_check_source === 'admin_override'
}

/**
 * A taken domain the check may put «For sale» on its own: not used in a brand,
 * not free, and not a status a person set by hand.
 */
export function isDiscoverableRow(row: Pick<PriceRow, 'status' | 'availability_status' | 'domain_check_source'>): boolean {
  if (row.status !== 'active' || row.domain_check_source === 'admin_override') return false
  return row.availability_status == null || row.availability_status === 'sold' || row.availability_status === 'unknown'
}

function isSource(value: string | null): value is NamingPriceSource {
  return (PRICE_SOURCES as readonly string[]).includes(value ?? '')
}

/** The fixed USD price of a reading that was read, or null. */
function fixedPrice(reading: StoredReading | undefined): number | null {
  if (!reading || reading.outcome !== 'listed' || reading.currency !== 'USD') return null
  return reading.amount != null && reading.amount > 0 ? reading.amount : null
}

function isJump(record: number, next: number): boolean {
  return next > record * JUMP_FACTOR || next < record / JUMP_FACTOR
}

/** The marketplace the price was last matched to goes first, then the fixed order. */
function sourceOrder(row: PriceRow): NamingPriceSource[] {
  const former = isSource(row.price_source) ? [row.price_source] : []
  return [...former, ...PRICE_SOURCES.filter(s => s !== row.price_source)]
}

interface Leader {
  source: NamingPriceSource
  /** False: found by an equal price just now, not yet written to the row. */
  stored: boolean
}

function leaderOf(row: PriceRow, readings: Map<NamingPriceSource, StoredReading>): Leader | null {
  if (row.purchase_price == null) return null
  if (isSource(row.price_source) && sameAmount(row.purchase_price, row.price_synced)) {
    return { source: row.price_source, stored: true }
  }
  for (const source of sourceOrder(row)) {
    if (sameAmount(fixedPrice(readings.get(source)), row.purchase_price)) return { source, stored: false }
  }
  return null
}

function bySource(readings: StoredReading[]): Map<NamingPriceSource, StoredReading> {
  return new Map(readings.map(r => [r.source, r]))
}

/**
 * The price in the record is a marketplace's and follows it — as opposed to a
 * price a person typed («вручну» in the admin table).
 */
export function isPriceAuto(row: PriceRow, stored: StoredReading[]): boolean {
  return isForSaleRow(row) && leaderOf(row, bySource(stored)) !== null
}

// ── Changes ─────────────────────────────────────────────────────────────────

export interface PriceCheckChange {
  /** Readings to store, pending prices included. */
  readings: StoredReading[]
  /** Columns of the naming to write; empty — nothing. */
  fields: PriceFields
  /** Take «For sale» off: the row goes back to Automatic (`naming-availability.ts`). */
  delist: boolean
  /** Put «For sale» on: a marketplace lists a taken domain; `fields` carry the price. */
  list: boolean
}

/**
 * `fresh` is one attempt at every marketplace — an unanswered or skipped one
 * comes as `unread`. A marketplace missing from it counts as unread too.
 */
export function applyPriceReadings(
  row: PriceRow,
  stored: StoredReading[],
  fresh: SourceReading[],
  now: Date
): PriceCheckChange {
  const nowIso = now.toISOString()
  const today = nowIso.slice(0, 10)
  const before = bySource(stored)

  const merged = new Map<NamingPriceSource, StoredReading>()
  for (const reading of fresh) {
    const old = before.get(reading.source)
    const pending = { pendingAmount: old?.pendingAmount ?? null, pendingDate: old?.pendingDate ?? null }
    if (reading.outcome === 'unread') {
      // The last answer that was read stays, with its date.
      merged.set(reading.source, {
        source: reading.source,
        outcome: 'unread',
        amount: old?.amount ?? null,
        currency: old?.currency ?? null,
        minOffer: old?.minOffer ?? null,
        url: old?.url ?? reading.url,
        attemptedAt: nowIso,
        readAt: old?.readAt ?? null,
        ...pending,
      })
    } else {
      merged.set(reading.source, {
        source: reading.source,
        outcome: reading.outcome,
        amount: reading.amount,
        currency: reading.currency,
        minOffer: reading.minOffer,
        url: reading.url,
        attemptedAt: nowIso,
        readAt: nowIso,
        ...pending,
      })
    }
  }
  const readings = [...merged.values()]
  const record = row.purchase_price

  // A taken domain nobody marked: «For sale» the moment a marketplace lists
  // it — but only on a full reading, so the price is the first of Afternic,
  // Sedo, Namecheap and not whichever happened to be asked.
  if (!isForSaleRow(row) && isDiscoverableRow(row)) {
    const asked = PRICE_SOURCES.every(source => merged.has(source))
    for (const source of asked ? PRICE_SOURCES : []) {
      const price = fixedPrice(merged.get(source))
      if (price != null) {
        return {
          readings,
          fields: { ...PRICE_STATE_RESET, purchase_price: price, price_source: source, price_synced: price },
          delist: false,
          list: true,
        }
      }
    }
    return { readings, fields: {}, delist: false, list: false }
  }

  // Rule 8, and a row that left «For sale» while it was being read.
  if (row.status !== 'active' || !isForSaleRow(row) || record == null) {
    return { readings, fields: {}, delist: false, list: false }
  }

  const fields: PriceFields = {}
  const leader = leaderOf(row, merged)
  if (leader && !leader.stored) {
    fields.price_source = leader.source
    fields.price_synced = record
    fields.price_dismissed_source = null
    fields.price_dismissed_amount = null
  }

  for (const reading of readings) {
    if (reading.outcome === 'unread') continue
    const price = fixedPrice(reading)
    const leads = leader?.source === reading.source
    if (!leads || price == null || sameAmount(price, record) || isJump(record, price)) {
      // Nothing waits: not the leader, no fixed price, the same price, or a
      // jump that a person has to confirm (rule 4).
      reading.pendingAmount = null
      reading.pendingDate = null
    } else if (sameAmount(reading.pendingAmount, price) && reading.pendingDate != null && reading.pendingDate < today) {
      // Rules 2 and 3: the leading marketplace, the same new price, another date.
      fields.purchase_price = price
      fields.price_source = reading.source
      fields.price_synced = price
      fields.price_prev = record
      fields.price_updated_at = nowIso
      fields.price_dismissed_source = null
      fields.price_dismissed_amount = null
      reading.pendingAmount = null
      reading.pendingDate = null
    } else if (!sameAmount(reading.pendingAmount, price)) {
      reading.pendingAmount = price
      reading.pendingDate = today
    }
  }

  // Rules 5 and 6. A date counts once, however many times the row was checked.
  const allAbsent = PRICE_SOURCES.every(source => merged.get(source)?.outcome === 'absent')
  let nights = row.price_absent_nights
  let date = row.price_absent_date
  if (!allAbsent) {
    nights = 0
    date = null
  } else if (date !== today) {
    nights += 1
    date = today
  }

  if (allAbsent && nights >= ABSENT_NIGHTS_TO_DELIST && leader?.stored) {
    return { readings: [], fields: { ...PRICE_STATE_RESET, price_delisted_at: nowIso }, delist: true, list: false }
  }
  if (nights !== row.price_absent_nights || date !== row.price_absent_date) {
    fields.price_absent_nights = nights
    fields.price_absent_date = date
  }
  return { readings, fields, delist: false, list: false }
}

// ── The line in the admin table ─────────────────────────────────────────────

function latest(dates: (string | null)[]): string | null {
  return dates.reduce<string | null>((max, d) => (d != null && (max == null || d > max) ? d : max), null)
}

export function describePriceCheck(row: PriceRow, stored: StoredReading[]): NamingPriceCheck | null {
  const readings = bySource(stored)
  const view = (
    kind: NamingPriceCheck['kind'],
    rest: Partial<Omit<NamingPriceCheck, 'kind' | 'sources'>>
  ): NamingPriceCheck => ({
    kind,
    date: null,
    source: null,
    url: null,
    amount: null,
    prev: null,
    ...rest,
    sources: PRICE_SOURCES.flatMap(source => {
      const r = readings.get(source)
      if (!r) return []
      return [
        {
          source,
          outcome: r.outcome,
          amount: r.amount,
          currency: r.currency,
          min_offer: r.minOffer,
          url: r.url,
          read_at: r.readAt,
        },
      ]
    }),
  })

  if (!isForSaleRow(row)) {
    if (row.price_delisted_at == null || row.domain_check_source === 'admin_override') return null
    return view('delisted', { date: row.price_delisted_at, prev: row.purchase_price })
  }
  const record = row.purchase_price
  if (stored.length === 0 || record == null) return null

  /** A price a person may take — or the grey line, once they chose not to. */
  const offer = (source: NamingPriceSource, amount: number): NamingPriceCheck => {
    const reading = readings.get(source)
    const dismissed = row.price_dismissed_source === source && sameAmount(row.price_dismissed_amount, amount)
    // A naming used in a brand is not edited, so there is nothing to decide.
    const kind = dismissed || row.status !== 'active' ? 'differs' : 'proposal'
    return view(kind, { date: reading?.readAt ?? null, source, url: reading?.url ?? null, amount })
  }
  const firstListed = (skip?: NamingPriceSource): NamingPriceCheck | null => {
    for (const source of sourceOrder(row)) {
      const price = source === skip ? null : fixedPrice(readings.get(source))
      if (price != null) return offer(source, price)
    }
    return null
  }
  const anyWithoutFixedPrice = () => stored.find(r => r.outcome === 'no_fixed_price')
  const lastRead = latest(stored.map(r => r.readAt))

  const leader = leaderOf(row, readings)
  if (leader) {
    const reading = readings.get(leader.source)
    if (!reading || reading.outcome === 'unread') return view('unread', { date: reading?.readAt ?? null })
    const at = { date: reading.readAt, source: leader.source, url: reading.url }
    const price = fixedPrice(reading)
    if (price != null) {
      if (sameAmount(price, record)) {
        return leader.stored && row.price_updated_at != null && row.price_prev != null
          ? view('updated', { ...at, date: row.price_updated_at, prev: row.price_prev })
          : view('verified', at)
      }
      // A jump waits for a person; anything smaller waits for its second date.
      return isJump(record, price) ? offer(leader.source, price) : view('differs', { ...at, amount: price })
    }
    if (reading.outcome === 'no_fixed_price') return view('no_fixed_price', at)
    // The leader dropped the listing. Another marketplace may still have it —
    // then its price is the seller's, and a person decides.
    return (
      firstListed(leader.source) ??
      (anyWithoutFixedPrice() ? view('no_fixed_price', { date: lastRead }) : view('not_found', { date: reading.readAt }))
    )
  }

  const listed = firstListed()
  if (listed) return listed
  const withoutPrice = anyWithoutFixedPrice()
  if (withoutPrice) return view('no_fixed_price', { date: withoutPrice.readAt, source: withoutPrice.source, url: withoutPrice.url })
  const allAbsent = PRICE_SOURCES.every(source => readings.get(source)?.outcome === 'absent')
  return allAbsent ? view('not_found_manual', { date: lastRead }) : view('unread', { date: lastRead })
}
