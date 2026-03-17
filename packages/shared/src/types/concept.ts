import { ENTITY_STATUSES } from '../constants/statuses';

export type ConceptStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES];

export type ConceptMode = 'light' | 'dark';

export interface Concept {
  id: string;
  name: string;
  description: string;
  mode: ConceptMode | null;
  status: ConceptStatus;
  visual_url: string | null;
  logo_url: string | null;
  preview_url: string | null;
  created_by: string;
  used_in_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateConceptPayload {
  name: string;
  description: string;
  mode?: ConceptMode | null;
  naming_ids?: string[];
}

export interface UpdateConceptPayload {
  name?: string;
  description?: string;
  mode?: ConceptMode | null;
  status?: ConceptStatus;
  visual_url?: string | null;
  logo_url?: string | null;
  preview_url?: string | null;
}
