import { ASSET_ENTITY_TYPES, ASSET_FILE_TYPES } from '../constants/assets';

export type AssetEntityType = (typeof ASSET_ENTITY_TYPES)[keyof typeof ASSET_ENTITY_TYPES];
export type AssetFileType = (typeof ASSET_FILE_TYPES)[keyof typeof ASSET_FILE_TYPES];

export interface Asset {
  id: string;
  entity_type: AssetEntityType;
  entity_id: string;
  file_url: string;
  file_name: string;
  file_type: AssetFileType;
  aspect_ratio: number;
  width: number;
  height: number;
  file_size: number;
  created_at: string;
}

export interface UploadAssetPayload {
  entity_type: AssetEntityType;
  entity_id: string;
  file: File;
}

export interface AssetValidationRule {
  entity_type: AssetEntityType;
  asset_slot: string;
  allowed_types: AssetFileType[];
  aspect_ratio: number;
  aspect_ratio_tolerance: number;
  min_width: number;
  min_height: number;
  max_file_size: number;
}
