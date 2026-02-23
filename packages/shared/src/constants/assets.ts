import type { AssetValidationRule } from '../types/asset';

export const ASSET_ENTITY_TYPES = {
  CONCEPT_VISUAL: 'concept_visual',
  CONCEPT_LOGO: 'concept_logo',
  CONCEPT_PREVIEW: 'concept_preview',
  COMPONENT_THUMBNAIL: 'component_thumbnail',
  COMPONENT_PREVIEW: 'component_preview',
} as const;

export const ASSET_FILE_TYPES = {
  PNG: 'png',
  SVG: 'svg',
} as const;

export const MAX_FILE_SIZES = {
  png: 10 * 1024 * 1024, // 10MB
  svg: 2 * 1024 * 1024,  // 2MB
} as const;

export const ASSET_VALIDATION_RULES: AssetValidationRule[] = [
  {
    entity_type: 'concept_visual',
    asset_slot: 'visual',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 16 / 9,
    aspect_ratio_tolerance: 0.05,
    min_width: 1280,
    min_height: 720,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'concept_logo',
    asset_slot: 'logo',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 1,
    aspect_ratio_tolerance: 0.05,
    min_width: 256,
    min_height: 256,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'concept_preview',
    asset_slot: 'preview',
    allowed_types: ['png'],
    aspect_ratio: 9 / 16,
    aspect_ratio_tolerance: 0.05,
    min_width: 360,
    min_height: 640,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'component_thumbnail',
    asset_slot: 'thumbnail',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 4 / 3,
    aspect_ratio_tolerance: 0.1,
    min_width: 400,
    min_height: 300,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'component_preview',
    asset_slot: 'preview',
    allowed_types: ['png'],
    aspect_ratio: 9 / 16,
    aspect_ratio_tolerance: 0.05,
    min_width: 360,
    min_height: 640,
    max_file_size: MAX_FILE_SIZES.png,
  },
];
