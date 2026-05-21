import { ENTITY_STATUSES } from '../constants/statuses';

export type ComponentVariantStatus = (typeof ENTITY_STATUSES)[keyof typeof ENTITY_STATUSES];

export interface ComponentType {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export interface ComponentVariant {
  id: string;
  component_type_id: string;
  name: string;
  variant_number: number;
  thumbnail_url: string | null;
  preview_url: string | null;
  status: ComponentVariantStatus;
  created_by: string;
  used_in_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateComponentTypePayload {
  name: string;
  description: string;
  sort_order?: number;
}

export interface CreateComponentVariantPayload {
  component_type_id: string;
  name: string;
  variant_number?: number;
}

export interface UpdateComponentVariantPayload {
  name?: string;
  variant_number?: number;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  status?: ComponentVariantStatus;
}
