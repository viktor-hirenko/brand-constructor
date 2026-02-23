import { ENTITY_STATUSES } from '../constants/statuses';

export type NamingStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES];

export interface ExternalNaming {
  id: string;
  name: string;
  concept_id: string | null;
  status: NamingStatus;
  created_by: string;
  used_in_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InternalNaming {
  id: string;
  name: string;
  status: NamingStatus;
  created_by: string;
  used_in_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExternalNamingPayload {
  name: string;
  concept_id?: string | null;
}

export interface CreateInternalNamingPayload {
  name: string;
}

export interface UpdateExternalNamingPayload {
  name?: string;
  concept_id?: string | null;
  status?: NamingStatus;
}

export interface UpdateInternalNamingPayload {
  name?: string;
  status?: NamingStatus;
}
