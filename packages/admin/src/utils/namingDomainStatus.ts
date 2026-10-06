import type { ExternalNaming } from '@brand-constructor/shared'

/**
 * Domain status of an external naming in the admin — the table cell and the
 * Automatic / For sale choice in the create and edit modals
 * (docs/architecture/domain-status-plan.md).
 *
 * Available shows the registrar's registration price, For sale the price the
 * team entered to buy it from the owner, Sold nothing: a taken domain has no
 * price one could pay to register it.
 */

export type DomainMode = 'automatic' | 'for_sale'

type PricedNaming = Pick<ExternalNaming, 'availability_status' | 'price' | 'purchase_price'>

export interface NamingPriceLabel {
  amount: string
  kind: 'registration' | 'purchase'
}

/** `$2 685` — thin grouping like the wizard card, no cents for whole dollars. */
export function formatUsd(value: number): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(2)
  const [whole, cents] = rounded.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `$${cents ? `${grouped}.${cents}` : grouped}`
}

export function resolveNamingPrice(n: PricedNaming): NamingPriceLabel | null {
  if (n.availability_status === 'for_sale' && n.purchase_price != null) {
    return { amount: formatUsd(n.purchase_price), kind: 'purchase' }
  }
  if (n.availability_status === 'available' && n.price != null) {
    return { amount: formatUsd(n.price), kind: 'registration' }
  }
  return null
}

export interface NamingStatusBadge {
  /** BEM modifier of `namings-view__status-badge`. */
  modifier: 'available' | 'sold' | 'for-sale' | 'unknown'
  label: string
}

export function resolveNamingStatusBadge(status: string | null | undefined): NamingStatusBadge {
  switch (status) {
    case 'available':
      return { modifier: 'available', label: '✓ Available' }
    case 'sold':
      return { modifier: 'sold', label: '✗ Sold' }
    case 'for_sale':
      return { modifier: 'for-sale', label: '$ For sale' }
    default:
      return { modifier: 'unknown', label: '? Unknown' }
  }
}

/**
 * Which choice the edit modal opens on. Any manual status opens as For sale —
 * the only manual one left; the 15 old manual «Available» rows then ask for
 * their purchase price (or a switch back to Automatic) on the next save.
 */
export function initialDomainMode(source: string | null | undefined): DomainMode {
  return source === 'admin_override' ? 'for_sale' : 'automatic'
}

/**
 * The registrar preview's error, in words: the stage runs without the
 * registrar on purpose, and the server says so in English.
 */
export function domainPreviewErrorText(message: string | null | undefined): string {
  if (message === 'Domain check service not configured') return 'Перевірка доменів тут вимкнена'
  return 'Не вдалося перевірити домен'
}

/** The purchase price field's text → dollars, or null when it is not a positive number. */
export function parsePurchasePrice(text: string): number | null {
  const cleaned = text.replace(/[\s $,]/g, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return value > 0 ? value : null
}

export function canSaveDomainMode(mode: DomainMode, purchasePriceText: string): boolean {
  return mode === 'automatic' || parsePurchasePrice(purchasePriceText) !== null
}

/**
 * The status part of the request body. `wasForSale` is false on create.
 * Automatic on a row that was manual sends `manual`, which tells the server to
 * recheck the domain right away; on a row that was automatic it sends nothing.
 */
export function buildDomainModeBody(
  mode: DomainMode,
  purchasePriceText: string,
  wasForSale: boolean
): Record<string, unknown> {
  if (mode === 'for_sale') {
    return {
      availability_status: 'for_sale',
      purchase_price: parsePurchasePrice(purchasePriceText),
    }
  }
  return wasForSale ? { domain_check_source: 'manual' } : {}
}
