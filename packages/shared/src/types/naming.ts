import { ENTITY_STATUSES } from '../constants/statuses'

export type NamingStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES]

/**
 * `for_sale` — taken, but the owner sells it; set by the team, never by the
 * registrar check (stored with `domain_check_source = 'admin_override'`).
 */
export type DomainAvailabilityStatus = 'available' | 'sold' | 'unknown' | 'for_sale'

export type DomainCheckSource = 'manual' | 'pananames' | 'admin_override'

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
