import { describe, expect, it } from 'vitest'
import {
  applyPriceReadings,
  describePriceCheck,
  isPriceAuto,
  type PriceRow,
  type StoredReading,
} from '../../../src/utils/price-check-rules'
import type { SourceReading } from '../../../src/utils/price-sources'

/**
 * The rules of the price check (docs/architecture/domain-price-sync-plan.md,
 * «Правила автоматики»). The purchase price of a resold domain is thousands of
 * dollars that the customer and the CEO choose a name by; the check may
 * rewrite it and take «For sale» off without anyone looking. Each rule below
 * is what keeps that from going wrong, and each test fails if the rule is
 * removed.
 */

type Source = SourceReading['source']

const listed = (source: Source, amount: number): SourceReading => ({
  source,
  outcome: 'listed',
  amount,
  currency: 'USD',
  minOffer: null,
  url: `https://${source}.test/x`,
})
const gone = (source: Source): SourceReading => ({ ...listed(source, 0), outcome: 'absent', amount: null, currency: null })
const failed = (source: Source): SourceReading => ({ ...gone(source), outcome: 'unread' })
const offers = (source: Source): SourceReading => ({ ...gone(source), outcome: 'no_fixed_price' })

/** Afternic, Sedo, Namecheap prices; null — no listing there. */
function prices(afternic: number | null, sedo: number | null, namecheap: number | null): SourceReading[] {
  const one = (source: Source, amount: number | null) => (amount == null ? gone(source) : listed(source, amount))
  return [one('afternic', afternic), one('sedo', sedo), one('namecheap', namecheap)]
}
const nowhere = prices(null, null, null)

function forSale(purchasePrice: number, over: Partial<PriceRow> = {}): PriceRow {
  return {
    status: 'active',
    availability_status: 'for_sale',
    domain_check_source: 'admin_override',
    purchase_price: purchasePrice,
    price_source: null,
    price_synced: null,
    price_prev: null,
    price_updated_at: null,
    price_absent_nights: 0,
    price_absent_date: null,
    price_delisted_at: null,
    price_dismissed_source: null,
    price_dismissed_amount: null,
    ...over,
  }
}

/** 06:30 UTC of the n-th night; `hours` later the same day for the recheck button. */
const night = (n: number, hours = 0) => new Date(Date.UTC(2026, 9, 7 + n, 6 + hours, 30))

/** A naming and its stored readings across checks — what the database keeps. */
function naming(initial: PriceRow) {
  let row = initial
  let stored: StoredReading[] = []
  return {
    get row() {
      return row
    },
    get line() {
      return describePriceCheck(row, stored)
    },
    check(fresh: SourceReading[], now: Date) {
      const change = applyPriceReadings(row, stored, fresh, now)
      if (change.delist) {
        // What `price-check.ts` writes: back to Automatic, readings dropped.
        row = { ...row, ...change.fields, availability_status: 'unknown', domain_check_source: 'manual' }
        stored = []
      } else if (change.list) {
        // And the other way: «For sale», stored as a person's would be.
        row = { ...row, ...change.fields, availability_status: 'for_sale', domain_check_source: 'admin_override' }
        stored = change.readings
      } else {
        row = { ...row, ...change.fields }
        const fresh = new Map(change.readings.map(r => [r.source, r]))
        stored = [...stored.filter(r => !fresh.has(r.source)), ...fresh.values()]
      }
      return change
    },
    /** A save in the admin: the price, typed by a person. */
    typePrice(price: number) {
      row = { ...row, purchase_price: price }
    },
  }
}

describe('rule 1 — a price no marketplace has is never touched', () => {
  it('whatever the marketplaces say, for as long as they say it', () => {
    const n = naming(forSale(2600))
    for (let i = 0; i < 4; i++) n.check(prices(2695, 2695, 2685), night(i))
    for (let i = 4; i < 8; i++) n.check(prices(2995, 2995, 2985), night(i))
    for (let i = 8; i < 13; i++) n.check(nowhere, night(i))

    expect(n.row).toMatchObject({ purchase_price: 2600, availability_status: 'for_sale', price_source: null })
  })

  it('the first check that finds an equal price makes that marketplace the leader', () => {
    const chamboo = naming(forSale(2685))
    chamboo.check(prices(2695, 2695, 2685), night(0))
    expect(chamboo.row).toMatchObject({ purchase_price: 2685, price_source: 'namecheap', price_synced: 2685 })

    const cashdisco = naming(forSale(7888))
    cashdisco.check(prices(7888, null, 7888), night(0))
    expect(cashdisco.row.price_source).toBe('afternic')
  })
})

describe('rule 2 — the price follows the leading marketplace only', () => {
  it('a new price elsewhere changes nothing; a new price at the leader is written', () => {
    const n = naming(forSale(2685))
    n.check(prices(2695, 2695, 2685), night(0))

    n.check(prices(2995, 2995, 2685), night(1))
    n.check(prices(2995, 2995, 2685), night(2))
    n.check(prices(2995, 2995, 2685), night(3))
    expect(n.row.purchase_price).toBe(2685)

    n.check(prices(2995, 2995, 2700), night(4))
    n.check(prices(2995, 2995, 2700), night(5))
    expect(n.row).toMatchObject({ purchase_price: 2700, price_source: 'namecheap' })
  })
})

describe('rule 3 — a new price is written only after two different dates', () => {
  it('one night is not enough, the second one is', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))

    n.check(prices(2995, 2995, 2985), night(1))
    expect(n.row.purchase_price).toBe(2795)
    expect(n.line).toMatchObject({ kind: 'differs', source: 'afternic', amount: 2995 })

    n.check(prices(2995, 2995, 2985), night(2))
    expect(n.row.purchase_price).toBe(2995)
  })

  it('the recheck button twice in one day is one date, not two', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, null, null), night(0))

    n.check(prices(2995, null, null), night(1))
    n.check(prices(2995, null, null), night(1, 2))
    n.check(prices(2995, null, null), night(1, 5))
    expect(n.row.purchase_price).toBe(2795)

    n.check(prices(2995, null, null), night(2))
    expect(n.row.purchase_price).toBe(2995)
  })

  it('a price seen once and gone again is not written; another new price starts over', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, null, null), night(0))

    n.check(prices(2995, null, null), night(1))
    n.check(prices(2795, null, null), night(2))
    n.check(prices(2995, null, null), night(3))
    expect(n.row.purchase_price).toBe(2795)

    n.check(prices(3100, null, null), night(4))
    expect(n.row.purchase_price).toBe(2795)
    n.check(prices(3100, null, null), night(5))
    expect(n.row.purchase_price).toBe(3100)
  })

  it('a night the leader did not answer neither writes the price nor loses it', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, null, null), night(0))
    n.check(prices(2995, null, null), night(1))

    n.check([failed('afternic'), gone('sedo'), gone('namecheap')], night(2))
    expect(n.row.purchase_price).toBe(2795)

    n.check(prices(2995, null, null), night(3))
    expect(n.row.purchase_price).toBe(2995)
  })
})

describe('rule 4 — more than twice up or down waits for a person', () => {
  it.each([
    ['up', 2795, 5600],
    ['down', 2795, 1390],
  ])('a jump %s is never written and is offered instead', (_dir, from, to) => {
    const n = naming(forSale(from))
    n.check(prices(from, null, null), night(0))
    for (let i = 1; i < 6; i++) n.check(prices(to, null, null), night(i))

    expect(n.row.purchase_price).toBe(from)
    expect(n.line).toMatchObject({ kind: 'proposal', source: 'afternic', amount: to })
  })

  it('exactly twice is not a jump', () => {
    const n = naming(forSale(1000))
    n.check(prices(1000, null, null), night(0))
    n.check(prices(2000, null, null), night(1))
    n.check(prices(2000, null, null), night(2))
    expect(n.row.purchase_price).toBe(2000)
  })
})

describe('rules 5 and 6 — «For sale» comes off after three clean nights without a listing', () => {
  const led = () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    return n
  }

  it('two nights are not enough; the third takes it off and keeps the price in the record', () => {
    const n = led()
    expect(n.check(nowhere, night(1)).delist).toBe(false)
    expect(n.check(nowhere, night(2)).delist).toBe(false)
    expect(n.row).toMatchObject({ availability_status: 'for_sale', price_absent_nights: 2 })
    expect(n.line).toMatchObject({ kind: 'not_found' })

    const third = n.check(nowhere, night(3))
    expect(third.delist).toBe(true)
    expect(n.row).toMatchObject({
      availability_status: 'unknown',
      domain_check_source: 'manual',
      purchase_price: 2795,
      price_source: null,
      price_delisted_at: night(3).toISOString(),
    })
    expect(n.line).toMatchObject({ kind: 'delisted', date: night(3).toISOString(), prev: 2795 })
  })

  it('a night when one marketplace did not answer starts the count over', () => {
    const n = led()
    n.check(nowhere, night(1))
    n.check(nowhere, night(2))
    n.check([gone('afternic'), failed('sedo'), gone('namecheap')], night(3))
    expect(n.row).toMatchObject({ availability_status: 'for_sale', price_absent_nights: 0 })

    n.check(nowhere, night(4))
    n.check(nowhere, night(5))
    expect(n.row.availability_status).toBe('for_sale')
    expect(n.check(nowhere, night(6)).delist).toBe(true)
  })

  it('a listing without a fixed price is still a listing', () => {
    const n = led()
    for (let i = 1; i < 6; i++) n.check([gone('afternic'), offers('sedo'), gone('namecheap')], night(i))
    expect(n.row).toMatchObject({ availability_status: 'for_sale', price_absent_nights: 0 })
  })

  it('three checks in one day are one night', () => {
    const n = led()
    n.check(nowhere, night(1))
    n.check(nowhere, night(1, 2))
    n.check(nowhere, night(1, 4))
    expect(n.row).toMatchObject({ availability_status: 'for_sale', price_absent_nights: 1 })
  })

  it('the listing coming back starts the count over', () => {
    const n = led()
    n.check(nowhere, night(1))
    n.check(nowhere, night(2))
    n.check(prices(2795, 2795, 2785), night(3))
    n.check(nowhere, night(4))
    n.check(nowhere, night(5))
    expect(n.row.availability_status).toBe('for_sale')
  })

  it('a row no marketplace leads is never taken off, only described', () => {
    const n = naming(forSale(1200))
    for (let i = 0; i < 6; i++) expect(n.check(nowhere, night(i)).delist).toBe(false)
    expect(n.row.availability_status).toBe('for_sale')
    expect(n.line).toMatchObject({ kind: 'not_found_manual' })
  })
})

describe('rule 6 — an unread marketplace changes nothing', () => {
  it('refusals and errors for a week: the same price, the same status, the last read date kept', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    const before = n.row
    for (let i = 1; i < 8; i++) n.check([failed('afternic'), failed('sedo'), failed('namecheap')], night(i))

    expect(n.row).toEqual(before)
    expect(n.line).toMatchObject({ kind: 'unread', date: night(0).toISOString() })
    expect(n.line?.sources.find(s => s.source === 'afternic')).toMatchObject({ outcome: 'unread', amount: 2795 })
  })
})

describe('rule 7 — zero or nothing is never a price', () => {
  it('a «listed» reading with a zero, should a reader ever return one, is not written', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, null, null), night(0))
    for (let i = 1; i < 4; i++) n.check([listed('afternic', 0), gone('sedo'), gone('namecheap')], night(i))
    expect(n.row.purchase_price).toBe(2795)

    const empty = { ...listed('afternic', 0), amount: null }
    for (let i = 4; i < 7; i++) n.check([empty, gone('sedo'), gone('namecheap')], night(i))
    expect(n.row.purchase_price).toBe(2795)
  })
})

describe('rule 8 — a naming used in an approved brand is never changed', () => {
  it('a new price for a week, then no listing for a week: the row is as it was approved', () => {
    const row = forSale(2795, { status: 'used', price_source: 'afternic', price_synced: 2795 })
    const n = naming(row)
    for (let i = 0; i < 7; i++) {
      const change = n.check(prices(2995, 2995, 2985), night(i))
      expect(change).toMatchObject({ fields: {}, delist: false })
    }
    expect(n.line).toMatchObject({ kind: 'differs', amount: 2995 })
    for (let i = 7; i < 14; i++) expect(n.check(nowhere, night(i))).toMatchObject({ fields: {}, delist: false })

    expect(n.row).toEqual(row)
    expect(n.line).toMatchObject({ kind: 'not_found' })
  })

  it('it is described, never offered a price to take', () => {
    const n = naming(forSale(2600, { status: 'used' }))
    n.check(prices(2695, 2695, 2685), night(0))
    expect(n.line).toMatchObject({ kind: 'differs', source: 'afternic', amount: 2695 })
  })
})

describe('rule 9 — a person’s edit ends the lead', () => {
  it('a price typed over a led one is not followed by the marketplace any more', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    n.typePrice(2500)

    for (let i = 1; i < 6; i++) n.check(prices(2995, 2995, 2985), night(i))
    for (let i = 6; i < 11; i++) n.check(nowhere, night(i))
    expect(n.row).toMatchObject({ purchase_price: 2500, availability_status: 'for_sale' })
  })

  it('the offer after such an edit is the price of the marketplace that led it', () => {
    const n = naming(forSale(2685))
    n.check(prices(2695, 2695, 2685), night(0))
    n.typePrice(2600)
    expect(n.line).toMatchObject({ kind: 'proposal', source: 'namecheap', amount: 2685 })
  })

  it('«For sale» set again after an automatic removal stays until the listing is back', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    for (let i = 1; i < 4; i++) n.check(nowhere, night(i))
    expect(n.row.availability_status).toBe('unknown')

    // The edit modal: «For sale» with the same price (`priceCheckChangeOnSave` resets the rest).
    const back = naming(forSale(2795))
    for (let i = 4; i < 10; i++) expect(back.check(nowhere, night(i)).delist).toBe(false)
    expect(back.row.availability_status).toBe('for_sale')

    back.check(prices(2795, null, null), night(10))
    back.check(nowhere, night(11))
    back.check(nowhere, night(12))
    expect(back.check(nowhere, night(13)).delist).toBe(true)
  })
})

describe('rule 11 — an automatic update says what it replaced', () => {
  it('the old price, the date and the marketplace are kept and shown', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    n.check(prices(2995, 2995, 2985), night(1))
    n.check(prices(2995, 2995, 2985), night(2))

    expect(n.row).toMatchObject({
      purchase_price: 2995,
      price_prev: 2795,
      price_updated_at: night(2).toISOString(),
      price_source: 'afternic',
    })
    expect(n.line).toMatchObject({ kind: 'updated', date: night(2).toISOString(), source: 'afternic', prev: 2795 })
  })
})

describe('a taken domain is put «For sale» by the check itself', () => {
  /** Taken, as the registrar left it; `unknown` — the stage, which has no registrar. */
  const taken = (over: Partial<PriceRow> = {}) =>
    forSale(0, { availability_status: 'sold', domain_check_source: 'pananames', purchase_price: null, ...over })

  it('a marketplace lists it at a fixed price: For sale with that price, led from the first night', () => {
    const n = naming(taken())
    const change = n.check(prices(null, 2695, 2685), night(0))

    expect(change.list).toBe(true)
    expect(n.row).toMatchObject({
      availability_status: 'for_sale',
      purchase_price: 2695,
      price_source: 'sedo',
      price_synced: 2695,
    })
    expect(isPriceAuto(n.row, change.readings)).toBe(true)
    expect(n.line).toMatchObject({ kind: 'verified', source: 'sedo' })
  })

  it('the seller’s price first: Afternic, then Sedo, then Namecheap', () => {
    const n = naming(taken({ availability_status: 'unknown', domain_check_source: 'manual' }))
    n.check(prices(2695, 2695, 2685), night(0))
    expect(n.row).toMatchObject({ purchase_price: 2695, price_source: 'afternic' })
  })

  it('from then on it is an ordinary led row: the price follows, the listing going takes For sale off', () => {
    const n = naming(taken())
    n.check(prices(2695, null, null), night(0))
    n.check(prices(2995, null, null), night(1))
    n.check(prices(2995, null, null), night(2))
    expect(n.row).toMatchObject({ purchase_price: 2995, price_prev: 2695 })

    for (let i = 3; i < 6; i++) n.check(nowhere, night(i))
    expect(n.row).toMatchObject({ availability_status: 'unknown', domain_check_source: 'manual' })
  })

  it('no listing, offers only, euros, or nothing readable: the row stays as it was', () => {
    for (const fresh of [
      nowhere,
      [offers('afternic'), gone('sedo'), gone('namecheap')],
      [gone('afternic'), { ...listed('sedo', 1300), outcome: 'no_fixed_price' as const, currency: 'EUR' }, gone('namecheap')],
      [failed('afternic'), failed('sedo'), failed('namecheap')],
      [listed('afternic', 0), gone('sedo'), gone('namecheap')],
    ]) {
      const n = naming(taken())
      expect(n.check(fresh, night(0))).toMatchObject({ list: false, fields: {} })
      expect(n.row).toEqual(taken())
    }
  })

  it('Namecheap alone is not enough: the price is set only when all three were asked', () => {
    const n = naming(taken())
    expect(n.check([listed('namecheap', 2685)], night(0))).toMatchObject({ list: false, fields: {} })
    expect(n.check([failed('afternic'), failed('sedo'), listed('namecheap', 2685)], night(1)).list).toBe(true)
    expect(n.row).toMatchObject({ purchase_price: 2685, price_source: 'namecheap' })
  })

  it.each([
    ['a free domain', { availability_status: 'available' }],
    ['a naming used in an approved brand', { status: 'used' }],
    ['a status a person set by hand before «For sale» existed', { availability_status: 'sold', domain_check_source: 'admin_override' }],
  ])('%s is never put For sale', (_name, over) => {
    const row = taken(over)
    const n = naming(row)
    for (let i = 0; i < 4; i++) expect(n.check(prices(2695, 2695, 2685), night(i))).toMatchObject({ list: false, fields: {} })
    expect(n.row).toEqual(row)
  })

  it('a price a person typed is not «auto», a marketplace’s is', () => {
    const typed = naming(forSale(2600))
    typed.check(prices(2695, 2695, 2685), night(0))
    expect(isPriceAuto(typed.row, [])).toBe(false)

    const matched = naming(forSale(2685))
    matched.check(prices(2695, 2695, 2685), night(0))
    expect(isPriceAuto(matched.row, [])).toBe(true)
    expect(isPriceAuto(taken(), [])).toBe(false)
  })
})

describe('the line under the price', () => {
  it('nothing before the first check', () => {
    expect(describePriceCheck(forSale(2795), [])).toBeNull()
  })

  it('the price equals a marketplace’s: verified, with the listing’s address', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, 2795, 2785), night(0))
    expect(n.line).toMatchObject({
      kind: 'verified',
      date: night(0).toISOString(),
      source: 'afternic',
      url: 'https://afternic.test/x',
    })
    expect(n.line?.sources.map(s => [s.source, s.amount])).toEqual([
      ['afternic', 2795],
      ['sedo', 2795],
      ['namecheap', 2785],
    ])
  })

  it('no marketplace has the price: the first one’s is offered — Afternic, Sedo, Namecheap', () => {
    const n = naming(forSale(2600))
    n.check(prices(null, 2695, 2685), night(0))
    expect(n.line).toMatchObject({ kind: 'proposal', source: 'sedo', amount: 2695 })
  })

  it('an offer a person left is a grey line until the marketplace’s price changes', () => {
    const n = naming(forSale(2600, { price_dismissed_source: 'afternic', price_dismissed_amount: 2695 }))
    n.check(prices(2695, 2695, 2685), night(0))
    expect(n.line).toMatchObject({ kind: 'differs', source: 'afternic', amount: 2695 })

    n.check(prices(2995, 2695, 2685), night(1))
    expect(n.line).toMatchObject({ kind: 'proposal', source: 'afternic', amount: 2995 })
  })

  it('the leader dropped the listing, another marketplace still has it: its price is offered', () => {
    const n = naming(forSale(2685))
    n.check(prices(2695, 2695, 2685), night(0))
    n.check(prices(2695, 2695, null), night(1))
    expect(n.line).toMatchObject({ kind: 'proposal', source: 'afternic', amount: 2695 })
    expect(n.row.purchase_price).toBe(2685)
  })

  it('offers only, or a price in euros: no fixed price', () => {
    const n = naming(forSale(2795))
    n.check(prices(2795, null, null), night(0))
    n.check([offers('afternic'), gone('sedo'), gone('namecheap')], night(1))
    expect(n.line).toMatchObject({ kind: 'no_fixed_price', source: 'afternic' })
    expect(n.row.purchase_price).toBe(2795)

    const euros = naming(forSale(1300))
    euros.check([gone('afternic'), { ...listed('sedo', 1300), outcome: 'no_fixed_price', currency: 'EUR' }, gone('namecheap')], night(0))
    expect(euros.line).toMatchObject({ kind: 'no_fixed_price', source: 'sedo' })
    expect(euros.row.price_source).toBeNull()
  })

  it('a row that is not «For sale» and was never taken off has no line', () => {
    const row = forSale(2795, { availability_status: 'sold', domain_check_source: 'pananames' })
    expect(describePriceCheck(row, [])).toBeNull()
  })
})
