import { ENTITY_STATUSES } from '../constants/statuses'

export type ConceptStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES]

export type ConceptMode = 'light' | 'dark'

export interface Concept {
  id: string
  name: string
  description: string
  mode: ConceptMode | null
  status: ConceptStatus
  visual_url: string | null
  gallery_url_1: string | null
  gallery_url_2: string | null
  gallery_url_3: string | null
  gallery_url_4: string | null
  gallery_url_5: string | null
  gallery_url_6: string | null
  gallery_url_7: string | null
  gallery_url_8: string | null
  gallery_url_9: string | null
  gallery_url_10: string | null
  created_by: string
  used_in_brand_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateConceptPayload {
  name: string
  description: string
  mode?: ConceptMode | null
  naming_ids?: string[]
}

export interface UpdateConceptPayload {
  name?: string
  description?: string
  mode?: ConceptMode | null
  status?: ConceptStatus
  visual_url?: string | null
  gallery_url_1?: string | null
  gallery_url_2?: string | null
  gallery_url_3?: string | null
  gallery_url_4?: string | null
  gallery_url_5?: string | null
  gallery_url_6?: string | null
  gallery_url_7?: string | null
  gallery_url_8?: string | null
  gallery_url_9?: string | null
  gallery_url_10?: string | null
}
