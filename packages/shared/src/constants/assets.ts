import type { AssetEntityType, AssetValidationRule } from '../types/asset'

export const ASSET_ENTITY_TYPES = {
  CONCEPT_VISUAL: 'concept_visual',
  CONCEPT_GALLERY_1: 'concept_gallery_1',
  CONCEPT_GALLERY_2: 'concept_gallery_2',
  CONCEPT_GALLERY_3: 'concept_gallery_3',
  CONCEPT_GALLERY_4: 'concept_gallery_4',
  CONCEPT_GALLERY_5: 'concept_gallery_5',
  CONCEPT_GALLERY_6: 'concept_gallery_6',
  CONCEPT_GALLERY_7: 'concept_gallery_7',
  CONCEPT_GALLERY_8: 'concept_gallery_8',
  CONCEPT_GALLERY_9: 'concept_gallery_9',
  CONCEPT_GALLERY_10: 'concept_gallery_10',
  COMPONENT_THUMBNAIL: 'component_thumbnail',
} as const

// SVG is intentionally absent from the upload allow-list. SVG can carry
// inline <script>, <foreignObject> and `on*` attributes, which turns
// user-uploaded assets into a stored XSS vector that bypasses size /
// dimension / aspect-ratio validation. The product flow never requires
// vector uploads (concept visuals, galleries and component thumbnails are
// raster screenshots), so the safe default is a hard ban. Re-introduce
// only behind a server-side sanitizer (DOMPurify-equivalent or stricter).
export const ASSET_FILE_TYPES = {
  PNG: 'png',
  JPG: 'jpg',
  WEBP: 'webp',
} as const

export const MAX_FILE_SIZES = {
  png: 10 * 1024 * 1024, // 10MB
  jpg: 10 * 1024 * 1024, // 10MB
  webp: 10 * 1024 * 1024, // 10MB
} as const

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
  aspect_ratio: number
  min_width: number
  min_height: number
}

/**
 * Aspect ratios derived from Figma prototype measurements.
 * Reference sizes: Header 387×64, Banners 273×144, Thumbnails 270×126, Tabbar 289×57, Sidebar 289×614.
 * Set aspect_ratio to 0 to disable ratio validation for a component type.
 */
export const COMPONENT_TYPE_ASPECT_RATIOS: Record<string, ComponentTypeAspectConfig> = {
  ct_header: { aspect_ratio: 6.05, min_width: 100, min_height: 20 },
  ct_banners: { aspect_ratio: 1.9, min_width: 100, min_height: 50 },
  ct_thumbnails: { aspect_ratio: 2.14, min_width: 100, min_height: 50 },
  ct_tabbar: { aspect_ratio: 5.07, min_width: 100, min_height: 20 },
  ct_sidebar: { aspect_ratio: 0.47, min_width: 100, min_height: 100 },
}

/**
 * Parse user input into a numeric aspect ratio.
 * Accepts "16:9" → 1.778, "1.5" → 1.5, empty/invalid → null.
 */
export function parseAspectRatio(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.includes(':')) {
    const [w, h] = trimmed.split(':').map(Number)
    if (!w || !h || isNaN(w) || isNaN(h) || h === 0) return null
    return w / h
  }

  const num = parseFloat(trimmed)
  return isNaN(num) || num <= 0 ? null : num
}

const CONCEPT_GALLERY_VALIDATION_RULES: AssetValidationRule[] = Array.from({ length: 10 }, (_, i) => {
  const n = i + 1
  return {
    entity_type: `concept_gallery_${n}` as AssetEntityType,
    asset_slot: `gallery_${n}`,
    allowed_types: ['png', 'jpg', 'webp'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0,
    min_width: 300,
    min_height: 300,
    max_file_size: MAX_FILE_SIZES.png,
  }
})

/**
 * Concept visual: optional ratio via upload form override (default 1:1 in admin).
 * Concept gallery slots 1–10: raster PNG/JPEG/WebP; ratio enforced via optional aspect_ratio form field (±1% when set).
 * Component thumbnail: dynamic ratio per component type (see COMPONENT_TYPE_ASPECT_RATIOS)
 */
export const ASSET_VALIDATION_RULES: AssetValidationRule[] = [
  {
    entity_type: 'concept_visual',
    asset_slot: 'visual',
    allowed_types: ['png', 'jpg', 'webp'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0,
    min_width: 300,
    min_height: 300,
    max_file_size: MAX_FILE_SIZES.png,
  },
  ...CONCEPT_GALLERY_VALIDATION_RULES,
  {
    entity_type: 'component_thumbnail',
    asset_slot: 'thumbnail',
    allowed_types: ['png', 'jpg', 'webp'],
    aspect_ratio: 0,
    aspect_ratio_tolerance: 0.15,
    min_width: 200,
    min_height: 40,
    max_file_size: MAX_FILE_SIZES.png,
  },
]
