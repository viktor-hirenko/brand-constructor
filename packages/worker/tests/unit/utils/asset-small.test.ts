import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSET_SMALL_MAX_BYTES,
  largeAssetSize,
  smallAssetKey,
  smallAssetSize,
  smallAssetUrl,
} from '@brand-constructor/shared'
import {
  ASSET_CACHE_CONTROL,
  ASSET_FALLBACK_CACHE_CONTROL,
  assetKeysToTry,
  validateSmallAsset,
} from '@/utils/asset-small'

/*
 * Owner, 29.09: wizard pictures load slowly and «лесенкою». Cards now ask for
 * a small copy (`?size=small`) that the admin makes at upload and the worker
 * stores next to the picture. Old pictures have none and must keep showing.
 */

/** Minimal WebP (VP8X header) of the given size, padded to `bytes`. */
function webp(width: number, height: number, bytes = 30): ArrayBuffer {
  const b = new Uint8Array(Math.max(30, bytes))
  b.set([0x52, 0x49, 0x46, 0x46], 0) // RIFF
  b.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
  b.set([0x56, 0x50, 0x38, 0x58], 12) // VP8X
  const w = width - 1
  const h = height - 1
  b.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24)
  b.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27)
  return b.buffer
}

function png(): ArrayBuffer {
  const b = new Uint8Array(30)
  b.set([0x89, 0x50, 0x4e, 0x47], 0)
  return b.buffer
}

describe('small copy names', () => {
  it('sits next to the picture under the asset id, whatever the picture type', () => {
    expect(smallAssetKey('concept_visual/con_1/ast_1.png')).toBe(
      'concept_visual/con_1/ast_1.small.webp'
    )
    expect(smallAssetKey('concept_gallery_3/con_1/ast_2.webp')).toBe(
      'concept_gallery_3/con_1/ast_2.small.webp'
    )
  })

  it('is asked for with ?size=small, only on our own pictures', () => {
    expect(smallAssetUrl('/api/assets/concept_visual/con_1/ast_1.png')).toBe(
      '/api/assets/concept_visual/con_1/ast_1.png?size=small'
    )
    expect(smallAssetUrl('https://picsum.photos/seed/x/460/460')).toBe(
      'https://picsum.photos/seed/x/460/460'
    )
  })
})

describe('sizes', () => {
  it('scales the largest production original to 2560 on the long side', () => {
    expect(largeAssetSize(4112, 2658)).toEqual({ width: 2560, height: 1655 })
  })

  it('never enlarges', () => {
    expect(largeAssetSize(2160, 2160)).toEqual({ width: 2160, height: 2160 })
  })

  it('makes the small copy 800 on the short side — cards are square and cropped', () => {
    expect(smallAssetSize(4112, 2658)).toEqual({ width: 1238, height: 800 })
    expect(smallAssetSize(2160, 2160)).toEqual({ width: 800, height: 800 })
  })

  it('makes none when the picture is not bigger than that already', () => {
    expect(smallAssetSize(800, 800)).toBeNull()
    expect(smallAssetSize(360, 1033)).toBeNull()
  })
})

describe('validateSmallAsset', () => {
  const large = { width: 2560, height: 1655 }

  it('accepts a WebP of the same picture, scaled down', () => {
    expect(validateSmallAsset(webp(1238, 800), large)).toEqual({ valid: true })
  })

  it('refuses anything that is not WebP', () => {
    expect(validateSmallAsset(png(), large).valid).toBe(false)
  })

  it('refuses a copy bigger than the picture', () => {
    expect(validateSmallAsset(webp(3000, 1939), large).valid).toBe(false)
  })

  it('refuses a copy of other proportions', () => {
    expect(validateSmallAsset(webp(800, 800), large).valid).toBe(false)
  })

  it('refuses a copy over the byte limit', () => {
    expect(validateSmallAsset(webp(1238, 800, ASSET_SMALL_MAX_BYTES + 1), large).valid).toBe(false)
  })
})

describe('GET ?size=small', () => {
  const key = 'concept_visual/con_1/ast_1.png'

  it('tries the small copy first, then the picture itself (old uploads have none)', () => {
    const url = new URL(`https://x/api/assets/${key}?size=small`)
    expect(assetKeysToTry(key, url)).toEqual(['concept_visual/con_1/ast_1.small.webp', key])
  })

  it('without the query serves only the picture, as before', () => {
    expect(assetKeysToTry(key, new URL(`https://x/api/assets/${key}`))).toEqual([key])
  })

  it('caches a fallback for a day, not a year, so a later small copy is picked up', () => {
    expect(ASSET_CACHE_CONTROL).toContain('max-age=31536000')
    expect(ASSET_FALLBACK_CACHE_CONTROL).toBe('public, max-age=86400')
  })
})

/*
 * The route handlers need D1 / R2 and cannot run in node; the wiring is pinned
 * by reading the source, as in concept-lock.test.ts.
 */
describe('wiring', () => {
  const routes = readFileSync(resolve(__dirname, '../../../src/routes/assets.ts'), 'utf8')
  const index = readFileSync(resolve(__dirname, '../../../src/index.ts'), 'utf8')

  it('upload checks the small copy before anything is stored', () => {
    const check = routes.indexOf('validateSmallAsset(smallBuffer, meta)')
    const firstPut = routes.indexOf('ASSETS_BUCKET.put(')
    expect(check).toBeGreaterThan(0)
    expect(check).toBeLessThan(firstPut)
  })

  it('upload stores the small copy under its predictable name', () => {
    expect(routes).toContain('ASSETS_BUCKET.put(smallAssetKey(r2Key), smallBuffer')
  })

  it('delete removes both copies', () => {
    expect(routes).toContain('ASSETS_BUCKET.delete([r2Key, smallAssetKey(r2Key)])')
  })

  it('the public GET honours ?size=small with a fallback', () => {
    expect(index).toContain('assetKeysToTry(key, new URL(c.req.url))')
    expect(index).toContain('ASSET_FALLBACK_CACHE_CONTROL')
  })
})
