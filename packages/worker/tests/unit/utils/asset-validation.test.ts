import { describe, expect, it } from 'vitest'
import { COMPONENT_TYPE_ASPECT_RATIOS } from '@brand-constructor/shared'
import { validateAsset } from '@/utils/asset-validation'

/**
 * Guards the UXUI-2554 slice geometry. The preview builds every slice at the
 * full 360 px width of the phone canvas and derives its height from the file,
 * so an upload whose proportions drift breaks the phone screen silently — the
 * slice just renders taller or shorter than the design.
 *
 * Sizes below are the Figma export sizes named in
 * docs/design-audit/uxui-2554-unified-previews.md.
 */
const SLICE_SIZES: Record<string, { width: number; height: number }> = {
  ct_header: { width: 360, height: 64 },
  ct_banners: { width: 360, height: 208 },
  ct_thumbnails: { width: 360, height: 388 },
  ct_tabbar: { width: 360, height: 56 },
  ct_sidebar: { width: 360, height: 1033 },
}

/**
 * Types whose ratio is enforced. The tabbar is absent on purpose: its height
 * varies by variant (56, or 68 when the variant has a raised action button).
 */
const RATIO_CHECKED_TYPES = ['ct_header', 'ct_banners', 'ct_thumbnails', 'ct_sidebar']

/** Pre-2554 sizes, measured off the old 289 px-wide coordinate mock-up. */
const LEGACY_SLICE_SIZES: Record<string, { width: number; height: number }> = {
  ct_header: { width: 387, height: 64 },
  ct_banners: { width: 273, height: 144 },
  ct_thumbnails: { width: 270, height: 126 },
  ct_sidebar: { width: 289, height: 614 },
}

/** Mirrors the admin upload: the type's configured ratio is sent as override. */
function validateSlice(typeId: string, width: number, height: number) {
  return validateAsset(
    'component_thumbnail',
    'png',
    200 * 1024,
    { width, height, aspectRatio: width / height },
    typeId,
    COMPONENT_TYPE_ASPECT_RATIOS[typeId].aspect_ratio
  )
}

describe('component slice aspect ratios', () => {
  it.each(Object.keys(SLICE_SIZES))('accepts the Figma export size for %s', typeId => {
    const { width, height } = SLICE_SIZES[typeId]
    expect(validateSlice(typeId, width, height)).toEqual({ valid: true, errors: [] })
  })

  it.each(Object.keys(SLICE_SIZES))('accepts the same slice exported at 2x for %s', typeId => {
    const { width, height } = SLICE_SIZES[typeId]
    expect(validateSlice(typeId, width * 2, height * 2).valid).toBe(true)
  })

  it.each(Object.keys(LEGACY_SLICE_SIZES))('rejects the pre-2554 size for %s', typeId => {
    const { width, height } = LEGACY_SLICE_SIZES[typeId]
    const result = validateSlice(typeId, width, height)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Wrong aspect ratio')
  })

  it('enforces a ratio for every type except the tabbar', () => {
    for (const typeId of RATIO_CHECKED_TYPES) {
      expect(COMPONENT_TYPE_ASPECT_RATIOS[typeId].aspect_ratio).toBeGreaterThan(0)
    }
    expect(COMPONENT_TYPE_ASPECT_RATIOS.ct_tabbar.aspect_ratio).toBe(0)
  })

  it('accepts both tabbar heights, flat and with a raised action button', () => {
    expect(validateSlice('ct_tabbar', 360, 56).valid).toBe(true)
    expect(validateSlice('ct_tabbar', 360, 68).valid).toBe(true)
  })

  it('rejects a slice whose height is off by more than 1%', () => {
    // 360×70 instead of 360×64: ratio 5.14 against an expected 5.625.
    const result = validateSlice('ct_header', 360, 70)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Wrong aspect ratio')
  })

  it('accepts a slice whose height is off by less than 1%', () => {
    // 1033 → 1038 is +0.48%, the kind of drift a resize introduces.
    expect(validateSlice('ct_sidebar', 360, 1038).valid).toBe(true)
  })

  it('rejects a slice below the per-type minimum size', () => {
    const result = validateSlice('ct_sidebar', 90, 258)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Image too small')
  })
})
