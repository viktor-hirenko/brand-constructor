import type { ExternalNaming } from '@brand-constructor/shared/types'
import { formatUiNameCardPrice } from '@/components/ui/uiNameCard'

/**
 * Which price the customer sees for an external naming
 * (docs/architecture/domain-status-plan.md): Available — what it costs to
 * register, For sale — what the owner asks for it, Sold — nothing. Before
 * this a resold domain read «$15, Available» at a real price of $7 888.
 */

type PricedNaming = Pick<ExternalNaming, 'availability_status' | 'price' | 'purchase_price'>

export function resolveExternalNamingPrice(n: PricedNaming): number | null {
  if (n.availability_status === 'available') return n.price ?? null
  if (n.availability_status === 'for_sale') return n.purchase_price ?? null
  return null
}

/** Step 3 order: Available, then For sale, then Sold and Unknown. */
export function externalNamingAvailabilityRank(status: string | null | undefined): number {
  if (status === 'available') return 0
  if (status === 'for_sale') return 1
  return 2
}

/**
 * The line next to a For sale pick in Final review, where the CEO decides:
 * «домен треба викупити, $7 888». Nothing for any other status.
 */
export function externalNamingReviewNote(n: PricedNaming): string | null {
  if (n.availability_status !== 'for_sale') return null
  const price = formatUiNameCardPrice(n.purchase_price)
  return price ? `домен треба викупити, ${price}` : 'домен треба викупити'
}
