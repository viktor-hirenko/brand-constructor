import { describe, expect, it } from 'vitest'
import type { NamingPriceCheck } from '@brand-constructor/shared'
import {
  DOMAIN_FILTERS,
  OPTIONAL_FILTERS,
  countDomainFilters,
  decisionTitle,
  displayedPrice,
  filterNamings,
  isForBrief,
  matchesQuery,
} from '@/utils/namingFilters'
import type { CheckedNaming } from '@/utils/namingPriceCheck'

/*
 * Search and quick filters of the namings table (owner, 07.10). The table had
 * 169 rows and nothing but a column sort: a row that waited for a person's
 * decision sat somewhere in the middle, and the «Ціна» sort put every domain
 * for sale at the end in no order, because it read the registration price.
 */

const AT = '2026-10-07T12:00:00.000Z'
const NOW = new Date('2026-10-08T12:00:00.000Z')
const plain = (text: string) => text.replace(/[^\S ]/g, ' ')

type Row = CheckedNaming & { name: string; tagline: string }

function row(name: string, rest: Partial<Row> = {}): Row {
  return {
    name,
    tagline: '',
    domain: `${name.toLowerCase()}.com`,
    price: null,
    purchase_price: null,
    availability_status: 'sold',
    domain_checked_at: null,
    domain_check_source: 'pananames',
    status: 'active',
    used_in_brand_id: null,
    price_check: null,
    price_auto: false,
    ...rest,
  }
}

const forSale = (name: string, price: number, rest: Partial<Row> = {}) =>
  row(name, { availability_status: 'for_sale', domain_check_source: 'admin_override', purchase_price: price, price_auto: true, ...rest })

const check = (kind: NamingPriceCheck['kind'], rest: Partial<NamingPriceCheck> = {}): NamingPriceCheck => ({
  kind,
  date: AT,
  source: null,
  url: null,
  amount: null,
  prev: null,
  sources: [],
  ...rest,
})

const rows: Row[] = [
  forSale('Chamboo', 2685, { price_check: check('verified', { source: 'namecheap' }) }),
  forSale('Darkmont', 2995, { price_check: check('updated', { source: 'afternic', prev: 2795 }) }),
  forSale('Frontiera', 1200, { price_auto: false, price_check: check('proposal', { source: 'afternic', amount: 97000 }) }),
  forSale('Goldrusha', 1200, { price_auto: false, tagline: 'Назва під концепт Gold Rush Saloon' }),
  row('Rollypop'),
  row('Joymus', { availability_status: 'available', price: 15 }),
  row('Rushwin', { availability_status: 'unknown', domain_check_source: 'manual' }),
]
const names = (list: Row[]) => list.map(r => r.name)

describe('quick filters', () => {
  it('«Потрібне рішення» leaves the rows that wait for a person', () => {
    expect(names(filterNamings(rows, { query: '', domain: 'decision' }, NOW))).toEqual(['Frontiera'])
  })

  it('by domain status', () => {
    expect(names(filterNamings(rows, { query: '', domain: 'for_sale' }, NOW))).toEqual(['Chamboo', 'Darkmont', 'Frontiera', 'Goldrusha'])
    expect(names(filterNamings(rows, { query: '', domain: 'available' }, NOW))).toEqual(['Joymus'])
    expect(names(filterNamings(rows, { query: '', domain: 'sold' }, NOW))).toEqual(['Rollypop'])
  })

  it('«Ціна змінилась» — the rows that show the arrow, for the same week', () => {
    expect(names(filterNamings(rows, { query: '', domain: 'changed' }, NOW))).toEqual(['Darkmont'])
    expect(filterNamings(rows, { query: '', domain: 'changed' }, new Date('2026-10-20T12:00:00.000Z'))).toEqual([])
  })

  it('«Вручну» — prices a person typed', () => {
    expect(names(filterNamings(rows, { query: '', domain: 'manual' }, NOW))).toEqual(['Frontiera', 'Goldrusha'])
  })

  it('no filter leaves everything; the numbers on the buttons are what each would leave', () => {
    expect(filterNamings(rows, { query: '', domain: null }, NOW)).toHaveLength(rows.length)
    expect(countDomainFilters(rows, NOW)).toEqual({
      decision: 1,
      for_brief: 0,
      for_sale: 4,
      available: 1,
      sold: 1,
      changed: 1,
      manual: 2,
    })
    expect(DOMAIN_FILTERS.map(f => f.id)).toEqual(['decision', 'for_brief', 'for_sale', 'available', 'sold', 'changed', 'manual'])
  })

  it('«Для брифу» — namings made for one brief’s order, in the version that has orders', () => {
    const made = [
      ...rows,
      { ...row('Goldfront'), for_brand_id: 'brand_122' },
      // Approved since: the row says «У бренді …», not «Для …».
      { ...row('QA Made 31A', { status: 'used' }), for_brand_id: 'brand_117' },
    ]
    expect(names(filterNamings(made, { query: '', domain: 'for_brief' }, NOW))).toEqual(['Goldfront'])
    expect(isForBrief(rows[0])).toBe(false)
    expect(OPTIONAL_FILTERS).toEqual(['decision', 'for_brief'])
  })
})

describe('search', () => {
  it('by name, by domain, by description — any case', () => {
    expect(names(filterNamings(rows, { query: 'cham', domain: null }, NOW))).toEqual(['Chamboo'])
    expect(names(filterNamings(rows, { query: 'ROLLYPOP.COM', domain: null }, NOW))).toEqual(['Rollypop'])
    expect(names(filterNamings(rows, { query: 'gold rush', domain: null }, NOW))).toEqual(['Goldrusha'])
  })

  it('a pasted address finds its domain; spaces around do not matter', () => {
    expect(matchesQuery(rows[0], '  https://chamboo.com/ ')).toBe(true)
    expect(matchesQuery(rows[0], 'https://darkmont.com')).toBe(false)
    expect(matchesQuery(rows[0], '   ')).toBe(true)
  })

  it('works together with a quick filter; a naming without a domain is searched by name', () => {
    expect(names(filterNamings(rows, { query: 'gold', domain: 'for_sale' }, NOW))).toEqual(['Goldrusha'])
    expect(matchesQuery({ name: 'Int One', tagline: '' }, 'one')).toBe(true)
  })
})

describe('the «Ціна» column sorts by the price the row shows', () => {
  it('a domain for sale — its purchase price; a free one — registration; a taken one — none', () => {
    expect(displayedPrice(rows[0])).toBe(2685)
    expect(displayedPrice(rows[5])).toBe(15)
    expect(displayedPrice(rows[4])).toBeNull()
  })

  it('a price left in the record of a row that is not For sale any more is not a price', () => {
    expect(displayedPrice(row('Old', { availability_status: 'sold', purchase_price: 1500 }))).toBeNull()
  })
})

describe('the tooltip of the red mark', () => {
  it('says what is to be decided', () => {
    expect(plain(decisionTitle(rows[2]))).toBe('Потрібне рішення: у записі $1 200, на Afternic — $97 000')
  })

  it('falls back to the words alone when there is no offer', () => {
    expect(decisionTitle(rows[0])).toBe('Потрібне рішення')
  })
})
