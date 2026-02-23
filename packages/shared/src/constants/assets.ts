import type { AssetValidationRule } from '../types/asset';

export const ASSET_ENTITY_TYPES = {
  CONCEPT_VISUAL: 'concept_visual',
  CONCEPT_LOGO: 'concept_logo',
  COMPONENT_THUMBNAIL: 'component_thumbnail',
} as const;

export const ASSET_FILE_TYPES = {
  PNG: 'png',
  SVG: 'svg',
} as const;

export const MAX_FILE_SIZES = {
  png: 10 * 1024 * 1024, // 10MB
  svg: 2 * 1024 * 1024, // 2MB
} as const;

/**
 * Aspect ratios per UI component type, derived from prototype measurements:
 * Header:     387x64  → 6.05:1
 * Banners:    273x144 → 1.9:1
 * Thumbnails: 270x126 → 2.14:1
 * Tabbar:     289x57  → 5.07:1
 * Sidebar:    289x614 → 0.47:1
 * Theme:      no image validation
 */
export interface ComponentTypeAspectConfig {
  aspect_ratio: number;
  min_width: number;
  min_height: number;
}

export const COMPONENT_TYPE_ASPECT_RATIOS: Record<string, ComponentTypeAspectConfig> = {
  ct_header: { aspect_ratio: 0, min_width: 100, min_height: 20 },
  ct_banners: { aspect_ratio: 0, min_width: 100, min_height: 50 },
  ct_thumbnails: { aspect_ratio: 0, min_width: 100, min_height: 50 },
  ct_tabbar: { aspect_ratio: 0, min_width: 100, min_height: 20 },
  ct_sidebar: { aspect_ratio: 0, min_width: 100, min_height: 100 },
};

/**
 * Concept visual: no ratio check (displayed via object-fit:cover, CSS handles cropping)
 * Concept logo:   no ratio check (test phase, final ratios TBD)
 * Component thumbnail: dynamic ratio per component type (see COMPONENT_TYPE_ASPECT_RATIOS)
 */
export const ASSET_VALIDATION_RULES: AssetValidationRule[] = [
  {
    entity_type: 'concept_visual',
    asset_slot: 'visual',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0,
    min_width: 300,
    min_height: 300,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'concept_logo',
    asset_slot: 'logo',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0,
    min_width: 64,
    min_height: 64,
    max_file_size: MAX_FILE_SIZES.png,
  },
  {
    entity_type: 'component_thumbnail',
    asset_slot: 'thumbnail',
    allowed_types: ['png', 'svg'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0.15,
    min_width: 200,
    min_height: 40,
    max_file_size: MAX_FILE_SIZES.png,
  },
];
