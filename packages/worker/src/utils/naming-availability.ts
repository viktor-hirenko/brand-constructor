// What an admin's save does to an external naming's domain status
// (docs/architecture/domain-status-plan.md). Two choices only:
//
//   Automatic — the registrar decides Available / Sold, the nightly job keeps
//               it fresh; leaving «For sale» for it rechecks the domain at once.
//   For sale  — taken, but the owner sells it; set by the team with the price
//               to buy it. Stored as `admin_override`, which the nightly job and
//               the recheck button already skip.
//
// A manual Available / Sold / Unknown is gone on purpose: a manual «Available»
// is what hid a $7 888 domain behind «$15» from the customer.

export interface AvailabilityInput {
  availability_status?: 'for_sale' | null
  domain_check_source?: 'manual' | 'pananames' | 'admin_override' | null
  purchase_price?: number | null
}

export interface AvailabilityRow {
  availability_status: string | null
  domain_check_source: string | null
  purchase_price: number | null
}

export type AvailabilityChange =
  | { error: string }
  | {
      /** Columns to write, on top of whatever else the save changes. */
      fields: Record<string, string | number | null>
      /** Ask the registrar right after the write (back to Automatic). */
      recheck: boolean
    }

export const PURCHASE_PRICE_REQUIRED = 'Purchase price is required for a domain for sale'
export const ONLY_FOR_SALE_IS_MANUAL = 'Only «For sale» can be set manually'

/**
 * `existing` is null for a new naming. The caller still rechecks on its own
 * when the domain itself changed — that rule is older than this one.
 */
export function resolveAvailabilityChange(
  input: AvailabilityInput,
  existing: AvailabilityRow | null
): AvailabilityChange {
  const wasForSale = existing?.domain_check_source === 'admin_override'

  if (input.availability_status === 'for_sale') {
    const price =
      input.purchase_price !== undefined ? input.purchase_price : (existing?.purchase_price ?? null)
    if (price == null || !(price > 0)) return { error: PURCHASE_PRICE_REQUIRED }
    return {
      fields: {
        availability_status: 'for_sale',
        domain_check_source: 'admin_override',
        price: null,
        purchase_price: price,
      },
      recheck: false,
    }
  }

  const fields: Record<string, string | number | null> = {}
  if (input.purchase_price !== undefined) {
    if (wasForSale && !(input.purchase_price != null && input.purchase_price > 0)) {
      return { error: PURCHASE_PRICE_REQUIRED }
    }
    fields.purchase_price = input.purchase_price
  }

  const source = input.domain_check_source
  if (source === 'admin_override') {
    // Re-sending the override a row already has is a no-op; making a new one
    // without «For sale» would freeze whatever status the row had.
    return wasForSale ? { fields, recheck: false } : { error: ONLY_FOR_SALE_IS_MANUAL }
  }

  if (wasForSale && (source === 'manual' || source === 'pananames')) {
    // Back to Automatic. Unknown until the registrar answers; the purchase
    // price is kept so switching back does not mean typing it again.
    return {
      fields: { ...fields, availability_status: 'unknown', domain_check_source: 'manual', price: null },
      recheck: true,
    }
  }

  return { fields, recheck: false }
}
