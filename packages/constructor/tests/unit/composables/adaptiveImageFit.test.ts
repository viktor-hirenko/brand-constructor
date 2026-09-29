import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CROP_TOLERANCE,
  resolveImageFit,
} from '@/composables/useAdaptiveImageFit'
import {
  PREVIEW_BOX_ASPECT_FALLBACK,
  PREVIEW_BOX_ASPECT_MAX,
  PREVIEW_BOX_ASPECT_MIN,
  PREVIEW_DRAWER_AREA_CLASS,
  PREVIEW_DRAWER_BOX_CLASS,
  PREVIEW_IMAGE_BACKDROP_CLASS,
  PREVIEW_IMAGE_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  previewImageFitClass,
  resolvePreviewBoxAspect,
} from '@/constants/previewLayout'

/**
 * DP-15450, both HIGH rows of the designer's review board:
 *
 *   Concept Selection 4 — «Preview концепту неправильно масштабується: на різних
 *   viewport частина зображення обрізається.» → «Зберігати фіксовані пропорції
 *   preview без crop.»
 *
 *   CEO view 4 — «Preview справа некоректно масштабується: порушуються
 *   пропорції, частина контенту не вміщується.» → «Зберігати фіксовані пропорції
 *   preview без crop.»
 *
 * Two things regress silently here and both are pinned below: the tolerance
 * creeping back up (the old value was 0.12, i.e. a picture could lose an eighth
 * of itself and still count as fitting), and the review square going back to
 * filling itself unconditionally, which is how it shipped before this work.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

describe('resolveImageFit — "без crop" is the rule, not a preference', () => {
  it('shows a picture whole as soon as it is a different shape from the square', () => {
    // A 3:2 shot in a square: filling it would cut a third of the width away.
    expect(resolveImageFit(1, 1.5)).toBe('contain')
    // A phone shot, the common case on these screens.
    expect(resolveImageFit(1, 9 / 16)).toBe('contain')
    // And the other way round — a square picture in a wide box.
    expect(resolveImageFit(1.5, 1)).toBe('contain')
  })

  it('fills the square only when there is nothing to cut', () => {
    expect(resolveImageFit(1, 1)).toBe('cover')
    expect(resolveImageFit(1.7777, 1.7777)).toBe('cover')
  })

  it('CANNOT crop a tenth of the picture — the old 12% threshold is gone', () => {
    // 1.1 against 1 crops ~9% of the width. Under the retired threshold this
    // was "close enough" and the picture lost its edges; it must not any more.
    expect(resolveImageFit(1.1, 1)).toBe('contain')
    expect(resolveImageFit(1, 1.1)).toBe('contain')
    // The exact number the threshold used to be.
    expect(resolveImageFit(1 / (1 - 0.12), 1)).toBe('contain')
  })

  it('keeps the tolerance small enough to be invisible in the drawn square', () => {
    // The square is 575 at 1440 (`Preview` in `5382:32075`). The band has to
    // stay under what the 24 radius already hides, or it is a crop by another
    // name.
    expect(CROP_TOLERANCE).toBeLessThanOrEqual(0.01)
    expect(575 * CROP_TOLERANCE).toBeLessThan(6)
    // …and big enough that a float ratio off a measured box does not flip it.
    expect(CROP_TOLERANCE).toBeGreaterThan(0)
    expect(resolveImageFit(1.001, 1)).toBe('cover')
  })

  it('falls back to filling while nothing is measured yet', () => {
    expect(resolveImageFit(null, 1)).toBe('cover')
    expect(resolveImageFit(1, null)).toBe('cover')
    expect(resolveImageFit(undefined, undefined)).toBe('cover')
    expect(resolveImageFit(0, 1)).toBe('cover')
    expect(resolveImageFit(1, 0)).toBe('cover')
    expect(resolveImageFit(Number.NaN, 1)).toBe('cover')
    expect(resolveImageFit(Number.POSITIVE_INFINITY, 1)).toBe('cover')
  })

  it('is symmetric — which side is wider does not change the verdict', () => {
    expect(resolveImageFit(2, 1)).toBe(resolveImageFit(1, 2))
    expect(resolveImageFit(1.002, 1)).toBe(resolveImageFit(1, 1.002))
  })
})

describe('previewImageFitClass', () => {
  it('maps the decision onto the two utilities and nothing else', () => {
    expect(previewImageFitClass('contain')).toBe('object-contain')
    expect(previewImageFitClass('cover')).toBe('object-cover')
  })

  it('the backdrop always fills — it is a backdrop, not content', () => {
    expect(PREVIEW_IMAGE_BACKDROP_CLASS).toContain('object-cover')
    expect(PREVIEW_IMAGE_BACKDROP_CLASS).toContain('blur-2xl')
    expect(PREVIEW_IMAGE_BACKDROP_CLASS).not.toContain('object-contain')
  })

  it('the picture class carries no fit of its own', () => {
    expect(PREVIEW_IMAGE_CLASS).not.toContain('object-')
  })
})

describe('both preview squares ask the same question', () => {
  const slider = read('components/constructor/preview/ConceptPreviewSlider.vue')
  const mobile = read('components/constructor/preview/ConceptMobilePreview.vue')

  it('the review / CEO square measures itself and honours the answer', () => {
    // This is the component behind CEO view 4. Before this work it had no
    // measurement and no decision at all.
    expect(mobile).toContain('useAdaptiveImageFit')
    expect(mobile).toContain('previewImageFitClass(mobileFit)')
    expect(mobile).toContain('recordAspect')
    expect(mobile).toMatch(/ref="squareRef"/)
  })

  it('the review / CEO square no longer hard-codes filling', () => {
    // The exact shape of the regression: a bare fill utility on the picture.
    expect(mobile).not.toMatch(/class="[^"]*\bobject-cover\b/)
  })

  it('the review / CEO square fills the leftover with the blurred copy', () => {
    expect(mobile).toContain('PREVIEW_IMAGE_BACKDROP_CLASS')
    expect(mobile).toMatch(/mobileFit === 'contain'/)
  })

  it('step 2 takes its classes from the same map, so the two cannot drift', () => {
    expect(slider).toContain('previewImageFitClass(bgFit)')
    expect(slider).toContain('previewImageFitClass(fgFit)')
    expect(slider).toContain('previewImageFitClass(expandedFit)')
    expect(slider).toContain('PREVIEW_IMAGE_BACKDROP_CLASS')
    // No hand-written ternary picking the fit any more.
    expect(slider).not.toMatch(/'object-contain'\s*:\s*'object-cover'/)
  })
})

/**
 * ── The gallery drawer's box, DP-15450, the owner's variant B ────────────────
 *
 * The drawer used to hand the picture the whole leftover height — 591 × 780 at
 * a 1440 × 900 window — while the gallery pictures are square, which left 94.5
 * of blurred backdrop above the picture and the same below. The box now takes
 * the picture's own proportion instead, so there is nothing left to fill.
 *
 * What can regress silently: the box going back to `h-full`, and the wizard's
 * square being "unified" with it. The second would be worse than the first —
 * that square is the designer's number and the whole right column is sized from
 * it, which is precisely why only the drawer may follow its picture.
 */
describe('resolvePreviewBoxAspect — the drawer box follows the picture', () => {
  it('gives a square box to the square pictures the library uploads', () => {
    // Gallery slots upload at 1:1 and the worker refuses more than 1% off
    // (`asset-validation.ts`), so this is the everyday case.
    expect(resolvePreviewBoxAspect(1)).toBe(1)
    expect(resolvePreviewBoxAspect(0.995)).toBeCloseTo(0.995, 5)
  })

  it('follows a picture that is not square, which is the whole point', () => {
    expect(resolvePreviewBoxAspect(1.5)).toBe(1.5)
    expect(resolvePreviewBoxAspect(9 / 16)).toBeCloseTo(0.5625, 5)
  })

  it('falls back to square while nothing has decoded yet', () => {
    expect(resolvePreviewBoxAspect(null)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(resolvePreviewBoxAspect(undefined)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(resolvePreviewBoxAspect(0)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(resolvePreviewBoxAspect(-2)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(resolvePreviewBoxAspect(Number.NaN)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(resolvePreviewBoxAspect(Number.POSITIVE_INFINITY)).toBe(PREVIEW_BOX_ASPECT_FALLBACK)
    expect(PREVIEW_BOX_ASPECT_FALLBACK).toBe(1)
  })

  it('refuses to collapse into a sliver on a stray panorama', () => {
    expect(resolvePreviewBoxAspect(12)).toBe(PREVIEW_BOX_ASPECT_MAX)
    expect(resolvePreviewBoxAspect(0.05)).toBe(PREVIEW_BOX_ASPECT_MIN)
    // At the widest allowed shape the box is still tall enough to hold the
    // 48 arrows on their 20 inset: 591 ÷ 2.5 = 236.
    expect(591 / PREVIEW_BOX_ASPECT_MAX).toBeGreaterThan(200)
  })
})

describe('the drawer sizes its box, the wizard keeps the designer’s square', () => {
  const slider = read('components/constructor/preview/ConceptPreviewSlider.vue')

  it('the drawer box is the fit pattern, not a full-height block', () => {
    expect(PREVIEW_DRAWER_BOX_CLASS.split(' ')).toContain('max-h-full')
    expect(PREVIEW_DRAWER_BOX_CLASS.split(' ')).toContain('w-full')
    // A stated height is exactly what made the box 780 tall; `max-h-full` is
    // the ceiling the ratio is allowed to shrink against, and it must not be
    // read as a height by this check.
    expect(PREVIEW_DRAWER_BOX_CLASS.split(' ')).not.toContain('h-full')
    // Without this the box would keep its shape but sit at the top.
    expect(PREVIEW_DRAWER_AREA_CLASS).toContain('items-center')
    expect(PREVIEW_DRAWER_AREA_CLASS).toContain('justify-center')
  })

  it('the slider binds a shape to the box and reads it from the picture', () => {
    expect(slider).toContain('resolvePreviewBoxAspect')
    expect(slider).toContain('slideAspectFor')
    expect(slider).toContain(':style="squareStyle"')
    expect(slider).toMatch(/aspectRatio/)
  })

  it('the shape is the drawer’s alone — the wizard square stays the kit’s', () => {
    expect(slider).toContain('PREVIEW_PANEL_SQUARE_CLASS')
    expect(PREVIEW_PANEL_SQUARE_CLASS).toContain('wizard-preview-square')
    // `squareStyle` must bail out when the panel is the wizard's column.
    expect(slider).toMatch(/if \(!props\.hideHeader\) return undefined/)
  })
})
