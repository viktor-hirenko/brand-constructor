import {
  ASSET_VALIDATION_RULES,
  ASSET_FILE_TYPES,
  COMPONENT_TYPE_ASPECT_RATIOS,
} from '@brand-constructor/shared'
import type { AssetEntityType, AssetFileType } from '@brand-constructor/shared'

interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface ImageMeta {
  width: number
  height: number
  aspectRatio: number
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46] // "RIFF"
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50] // "WEBP"

// SVG detection is intentionally absent. SVG can carry inline scripts and
// would also bypass the dimension / aspect-ratio checks below, so anything
// that looks like SVG / XML falls through to the `null` return and is
// rejected by routes/assets.ts as "Unsupported file type. Allowed: PNG,
// JPEG, WebP." See packages/shared/src/constants/assets.ts for the rationale
// behind the allow-list.
export function detectFileType(buffer: ArrayBuffer): AssetFileType | null {
  const bytes = new Uint8Array(buffer)

  if (bytes.length >= 4 && PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return ASSET_FILE_TYPES.PNG
  }

  if (bytes.length >= 3 && JPEG_MAGIC.every((b, i) => bytes[i] === b)) {
    return ASSET_FILE_TYPES.JPG
  }

  if (
    bytes.length >= 12 &&
    RIFF_MAGIC.every((b, i) => bytes[i] === b) &&
    WEBP_MAGIC.every((b, i) => bytes[i + 8] === b)
  ) {
    return ASSET_FILE_TYPES.WEBP
  }

  return null
}

export function extractPngDimensions(buffer: ArrayBuffer): ImageMeta | null {
  const view = new DataView(buffer)
  if (buffer.byteLength < 24) return null

  const width = view.getUint32(16)
  const height = view.getUint32(20)

  if (width === 0 || height === 0) return null

  return { width, height, aspectRatio: width / height }
}

export function extractJpegDimensions(buffer: ArrayBuffer): ImageMeta | null {
  try {
    const bytes = new Uint8Array(buffer)
    if (bytes.length < 4) return null

    let offset = 2
    while (offset + 1 < bytes.length) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]

      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        if (offset + 9 > bytes.length) return null
        const view = new DataView(buffer)
        const height = view.getUint16(offset + 5)
        const width = view.getUint16(offset + 7)
        if (width === 0 || height === 0) return null
        return { width, height, aspectRatio: width / height }
      }

      if (offset + 3 >= bytes.length) break
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3]
      if (segLen < 2) break
      offset += 2 + segLen
    }

    return null
  } catch {
    return null
  }
}

export function extractWebpDimensions(buffer: ArrayBuffer): ImageMeta | null {
  try {
    const bytes = new Uint8Array(buffer)
    if (bytes.length < 30) return null

    const subtype = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])

    if (subtype === 'VP8 ' && bytes.length >= 30) {
      const view = new DataView(buffer)
      const width = view.getUint16(26, true) & 0x3fff
      const height = view.getUint16(28, true) & 0x3fff
      if (width === 0 || height === 0) return null
      return { width, height, aspectRatio: width / height }
    }

    if (subtype === 'VP8L' && bytes.length >= 25) {
      const b0 = bytes[21]
      const b1 = bytes[22]
      const b2 = bytes[23]
      const b3 = bytes[24]
      const width = 1 + (((b1 & 0x3f) << 8) | b0)
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 >> 6) & 0x03))
      if (width === 0 || height === 0) return null
      return { width, height, aspectRatio: width / height }
    }

    if (subtype === 'VP8X' && bytes.length >= 30) {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16))
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
      if (width === 0 || height === 0) return null
      return { width, height, aspectRatio: width / height }
    }

    return null
  } catch {
    return null
  }
}

function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 100) / 100
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2)
}

export function validateAsset(
  entityType: AssetEntityType,
  fileType: AssetFileType,
  fileSize: number,
  meta: ImageMeta | null,
  componentTypeId?: string,
  aspectRatioOverride?: number
): ValidationResult {
  const errors: string[] = []

  const rule = ASSET_VALIDATION_RULES.find(r => r.entity_type === entityType)
  if (!rule) {
    return { valid: false, errors: [`Unknown entity type: ${entityType}`] }
  }

  if (!rule.allowed_types.includes(fileType)) {
    errors.push(`File type "${fileType}" not allowed. Accepted: ${rule.allowed_types.join(', ')}`)
  }

  if (fileSize > rule.max_file_size) {
    const maxMb = (rule.max_file_size / (1024 * 1024)).toFixed(0)
    const actualMb = (fileSize / (1024 * 1024)).toFixed(2)
    errors.push(`File too large: ${actualMb}MB (max ${maxMb}MB)`)
  }

  if (!meta) {
    errors.push('Could not read image dimensions')
    return { valid: false, errors }
  }

  let minWidth = rule.min_width
  let minHeight = rule.min_height

  if (entityType === 'component_thumbnail' && componentTypeId) {
    const typeConfig = COMPONENT_TYPE_ASPECT_RATIOS[componentTypeId]
    if (typeConfig) {
      minWidth = typeConfig.min_width
      minHeight = typeConfig.min_height
    }
  }

  if (meta.width < minWidth || meta.height < minHeight) {
    errors.push(`Image too small: ${meta.width}x${meta.height} (minimum ${minWidth}x${minHeight})`)
  }

  // Aspect ratio check: user-provided override takes priority
  // If override is a valid positive number — use it with ±1% tolerance
  // If override is undefined/NaN — no ratio check (any proportions allowed)
  const hasOverride =
    aspectRatioOverride !== undefined && !isNaN(aspectRatioOverride) && aspectRatioOverride > 0

  if (hasOverride) {
    const actualRatio = meta.aspectRatio
    const tolerance = aspectRatioOverride * 0.01
    if (Math.abs(actualRatio - aspectRatioOverride) > tolerance) {
      errors.push(
        `Wrong aspect ratio: ${formatRatio(actualRatio)} (expected ~${formatRatio(aspectRatioOverride)}, tolerance ±1%)`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}
