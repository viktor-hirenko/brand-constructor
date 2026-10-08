import { ENTITY_STATUSES } from '../constants/statuses'

export type NamingStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES]

/**
 * `for_sale` — taken, but the owner sells it; set by the team, never by the
 * registrar check (stored with `domain_check_source = 'admin_override'`).
 */
export type DomainAvailabilityStatus = 'available' | 'sold' | 'unknown' | 'for_sale'

export type DomainCheckSource = 'manual' | 'pananames' | 'admin_override'

/** Marketplaces the server reads a «For sale» domain's price from. */
export type NamingPriceSource = 'afternic' | 'sedo' | 'namecheap'

/**
 * What one marketplace answered: a fixed USD price, a listing without one
 * (offers only, another currency), no listing, or nothing readable.
 */
export type NamingPriceOutcome = 'listed' | 'no_fixed_price' | 'absent' | 'unread'

export interface NamingPriceSourceReading {
  source: NamingPriceSource
  outcome: NamingPriceOutcome
  amount: number | null
  currency: string | null
  min_offer: number | null
  url: string | null
  /** When the answer was last read; an unread attempt keeps the older date. */
  read_at: string | null
}

/**
 * What the price check knows of a domain, for the admin's card, decided on the server
 * (`worker/src/utils/price-check-rules.ts`):
 *
 *   verified         — the price equals the marketplace's
 *   updated          — the marketplace changed it and the server followed
 *   differs          — the marketplace has another price; nothing to decide
 *   proposal         — the same, and a person has to decide
 *   no_fixed_price   — listed, but with no fixed USD price
 *   not_found        — the listing is gone (the row will leave «For sale»)
 *   not_found_manual — no listing, and the price was never a marketplace's
 *   unread           — the marketplace did not answer
 *   delisted         — «For sale» was taken off automatically
 *   not_listed       — a taken domain: no marketplace has a listing (it is not «For sale»)
 *
 * A taken domain that is not «For sale» gets `not_listed`, `no_fixed_price`
 * or `unread` once the marketplaces were asked about it.
 */
export interface NamingPriceCheck {
  kind:
    | 'verified'
    | 'updated'
    | 'differs'
    | 'proposal'
    | 'no_fixed_price'
    | 'not_found'
    | 'not_found_manual'
    | 'unread'
    | 'delisted'
    | 'not_listed'
  date: string | null
  source: NamingPriceSource | null
  url: string | null
  /** The marketplace's price, when it is not the one in the record. */
  amount: number | null
  /** The price before the automatic update or removal. */
  prev: number | null
  sources: NamingPriceSourceReading[]
}

export interface ExternalNaming {
  id: string
  name: string
  tagline: string
  domain: string | null
  /** Registration price from the registrar; only an available domain has one. */
  price: number | null
  /** Price to buy a `for_sale` domain from its owner, USD, entered by the team. */
  purchase_price: number | null
  availability_status: DomainAvailabilityStatus | null
  domain_checked_at: string | null
  domain_check_source: DomainCheckSource | null
  concept_id: string | null
  status: NamingStatus
  created_by: string
  used_in_brand_id: string | null
  created_at: string
  updated_at: string
  /** Only in list rows of a naming the marketplaces were asked about. */
  price_check?: NamingPriceCheck | null
  /** List rows: the «For sale» price is a marketplace's and follows it, not typed by a person. */
  price_auto?: boolean
}

export interface InternalNaming {
  id: string
  name: string
  tagline: string
  status: NamingStatus
  created_by: string
  used_in_brand_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateExternalNamingPayload {
  name: string
  tagline?: string
  domain?: string | null
  price?: number | null
  purchase_price?: number | null
  availability_status?: DomainAvailabilityStatus | null
  concept_id?: string | null
}

export interface CreateInternalNamingPayload {
  name: string
  tagline?: string
}

export interface UpdateExternalNamingPayload {
  name?: string
  tagline?: string
  domain?: string | null
  price?: number | null
  purchase_price?: number | null
  availability_status?: DomainAvailabilityStatus | null
  concept_id?: string | null
  status?: NamingStatus
}

export interface UpdateInternalNamingPayload {
  name?: string
  tagline?: string
  status?: NamingStatus
}
