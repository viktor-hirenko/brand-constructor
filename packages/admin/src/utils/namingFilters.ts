import type { ExternalNaming } from '@brand-constructor/shared'
import { formatUsd } from '@/utils/namingDomainStatus'
import {
  PRICE_SOURCE_LABELS,
  needsDecision,
  priceCellExtras,
  priceOffer,
  type CheckedNaming,
} from '@/utils/namingPriceCheck'

/**
 * Finding a row in the namings table (owner, 07.10: 169 rows and only a
 * column sort to look through them). A search by name and domain, and quick
 * filters one click each — the first of them the rows that wait for a person,
 * which nobody would find by scrolling.
 */

export type DomainFilter = 'decision' | 'for_brief' | 'for_sale' | 'available' | 'sold' | 'changed' | 'manual'

/** In the order of the buttons above the table. */
export const DOMAIN_FILTERS: { id: DomainFilter; label: string }[] = [
  { id: 'decision', label: 'Потрібне рішення' },
  { id: 'for_brief', label: 'Для брифу' },
  { id: 'for_sale', label: 'For sale' },
  { id: 'available', label: 'Available' },
  { id: 'sold', label: 'Sold' },
  { id: 'changed', label: 'Ціна змінилась' },
  { id: 'manual', label: 'Вручну' },
]

type FilterNaming = CheckedNaming & Pick<ExternalNaming, 'name' | 'tagline'>

/** Buttons that are there only while they would leave something. */
export const OPTIONAL_FILTERS: readonly DomainFilter[] = ['decision', 'for_brief']

/**
 * Made by the team for one brief's order and still waiting in it — the rows
 * with the «Для New Brand #121» badge. Once the brand is approved the same row
 * says «У бренді …» and is found by «Використані». Only the version with
 * orders has such rows.
 */
export function isForBrief(n: object): boolean {
  const row = n as { for_brand_id?: string | null; status?: string }
  return row.for_brand_id != null && row.status !== 'used'
}

export function matchesDomainFilter(n: CheckedNaming, filter: DomainFilter, now: Date = new Date()): boolean {
  switch (filter) {
    case 'decision':
      return needsDecision(n)
    case 'for_brief':
      return isForBrief(n)
    case 'for_sale':
    case 'available':
    case 'sold':
      return n.availability_status === filter
    // The same week the arrow beside the price is shown for.
    case 'changed':
      return priceCellExtras(n, now).trend !== null
    case 'manual':
      return priceCellExtras(n, now).manual
  }
}

/** How many rows each button would leave — shown on the button. */
export function countDomainFilters(rows: CheckedNaming[], now: Date = new Date()): Record<DomainFilter, number> {
  const counts = { decision: 0, for_brief: 0, for_sale: 0, available: 0, sold: 0, changed: 0, manual: 0 }
  for (const row of rows) {
    for (const { id } of DOMAIN_FILTERS) if (matchesDomainFilter(row, id, now)) counts[id]++
  }
  return counts
}

/** A name, its description or its domain contains the text; case and a pasted `https://` do not matter. */
export function matchesQuery(n: Pick<FilterNaming, 'name' | 'tagline'> & { domain?: string | null }, query: string): boolean {
  const text = query
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  if (!text) return true
  return [n.name, n.tagline, n.domain].some(value => (value ?? '').toLowerCase().includes(text))
}

export function filterNamings<T extends FilterNaming>(
  rows: T[],
  filter: { query: string; domain: DomainFilter | null },
  now: Date = new Date()
): T[] {
  return rows.filter(
    n => matchesQuery(n, filter.query) && (filter.domain === null || matchesDomainFilter(n, filter.domain, now))
  )
}

/**
 * The number the «Ціна» column sorts by — the one the row shows: the purchase
 * price of a domain for sale, the registration price of a free one. Sorting by
 * the raw `price` column put every «For sale» row at the end, in no order.
 */
export function displayedPrice(n: Pick<ExternalNaming, 'availability_status' | 'price' | 'purchase_price'>): number | null {
  if (n.availability_status === 'for_sale') return n.purchase_price
  if (n.availability_status === 'available') return n.price
  return null
}

/** The tooltip of the red mark: what is to be decided, before the card is opened. */
export function decisionTitle(n: CheckedNaming): string {
  const offer = priceOffer(n.price_check)
  if (!offer || n.purchase_price == null) return 'Потрібне рішення'
  return `Потрібне рішення: у записі ${formatUsd(n.purchase_price)}, на ${PRICE_SOURCE_LABELS[offer.source]} — ${formatUsd(offer.amount)}`
}
