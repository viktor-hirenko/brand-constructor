import {
  ASSET_SMALL_MAX_BYTES,
  ASSET_SMALL_QUERY_KEY,
  ASSET_SMALL_QUERY_VALUE,
  smallAssetKey,
} from '@brand-constructor/shared'
import { detectFileType, extractWebpDimensions } from './asset-validation'

/*
 * The small copy of an upload — see packages/shared/src/utils/assetVariants.ts.
 *
 * It is checked AGAINST the large copy, which has already passed the usual
 * type / size / minimum / ratio rules: the small one only has to be a WebP of
 * the same picture, scaled down. It gets no row in `assets`; it lives in R2
 * next to the large one under `smallAssetKey`.
 */

interface Size {
  width: number
  height: number
}

/** How far the small copy's ratio may drift from the large one's (rounding). */
const RATIO_TOLERANCE = 0.02

export function validateSmallAsset(
  buffer: ArrayBuffer,
  large: Size
): { valid: true } | { valid: false; error: string } {
  if (detectFileType(buffer) !== 'webp') {
    return { valid: false, error: 'Small copy must be WebP' }
  }
  if (buffer.byteLength > ASSET_SMALL_MAX_BYTES) {
    return { valid: false, error: 'Small copy is too large' }
  }
  const meta = extractWebpDimensions(buffer)
  if (!meta) {
    return { valid: false, error: 'Could not read small copy dimensions' }
  }
  if (meta.width > large.width || meta.height > large.height) {
    return { valid: false, error: 'Small copy is bigger than the image' }
  }
  const largeRatio = large.width / large.height
  if (Math.abs(meta.aspectRatio - largeRatio) > largeRatio * RATIO_TOLERANCE) {
    return { valid: false, error: 'Small copy has different proportions' }
  }
  return { valid: true }
}

/**
 * R2 keys to try for `GET /api/assets/<key>`, in order. `?size=small` tries the
 * small copy first and falls back to the picture itself — every upload made
 * before small copies existed has none.
 */
export function assetKeysToTry(key: string, url: URL): string[] {
  const wantsSmall = url.searchParams.get(ASSET_SMALL_QUERY_KEY) === ASSET_SMALL_QUERY_VALUE
  return wantsSmall ? [smallAssetKey(key), key] : [key]
}

/**
 * A small request answered with the large picture is cached for a day, not a
 * year: once the picture gets its small copy (converting old uploads), cards
 * should pick it up without anyone clearing caches.
 */
export const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable'
export const ASSET_FALLBACK_CACHE_CONTROL = 'public, max-age=86400'
