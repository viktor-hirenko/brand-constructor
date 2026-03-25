import { ENTITY_STATUSES } from '../constants/statuses'

export type NamingStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES]

export type DomainAvailabilityStatus = 'available' | 'sold' | 'unknown'

export type DomainCheckSource = 'manual' | 'godaddy' | 'admin_override'

export interface ExternalNaming {
  id: string
  name: string
  tagline: string
  domain: string | null
  price: number | null
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
  availability_status?: DomainAvailabilityStatus | null
  concept_id?: string | null
  status?: NamingStatus
}

export interface UpdateInternalNamingPayload {
  name?: string
  tagline?: string
  status?: NamingStatus
}
