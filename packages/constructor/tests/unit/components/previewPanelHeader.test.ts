import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  PREVIEW_HEADER_RESERVE_CLASS,
  MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS,
} from '@/constants/previewLayout'
import { WIZARD_PREVIEW_HEADER_HEIGHT, WIZARD_PREVIEW_GAP } from '@/constants/wizardResponsive'

/**
 * Every header in the right column is 32 — Figma `Preview panel` `3839:9513`,
 * whose `Header` is the 24/32 name row and nothing else.
 *
 * Why this file exists: the right column's WIDTH is derived from its height by
 * subtracting exactly 120 — two 32 paddings, a 32 header and a 24 gap
 * (`wizardResponsive.ts`). The preview under the header is a `flex-1` box, so
 * a header that is not 32 silently steals the difference from the square and
 * the column stops matching its own width. Three of them were 48, 48 and 55
 * and nobody noticed for the length of the responsive work; the square came
 * out 16 short on steps 3 and 4, and jumped 23 when a skeleton was replaced by
 * the real header.
 *
 * The check is deliberately crude — it looks for the shapes that make a header
 * taller than its line box — because the precise height is not knowable from
 * source in this package (no jsdom, `vitest.config.ts:11` is `environment:
 * 'node'`). It is the shapes that went wrong, every time.
 *
 * Verified to fail, not assumed to: put `py-2` back on `ConceptMobilePreview`,
 * or `h-[48px]` back on the slider skeleton, and this file goes red.
 */

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/** The prose in these files quotes the old values; measure the markup only. */
const withoutComments = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

/** Every component that renders into the shell's `right` slot and draws a header. */
const RIGHT_SLOT_FILES = [
  'components/constructor/preview/ConceptPreviewSlider.vue',
  'components/constructor/preview/ConceptMobilePreview.vue',
  'components/constructor/preview/BrandPreviewPanel.vue',
  'components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue',
  'components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue',
  'components/constructor/skeletons/ConceptMobilePreviewSkeleton.vue',
] as const

describe('the right column header is 32 everywhere — Figma 3839:9513', () => {
  it.each(RIGHT_SLOT_FILES)('%s pads no height onto its header row', file => {
    const markup = withoutComments(read(file))

    // `py-*` on the title row is exactly how `ConceptMobilePreview` grew to 48.
    // Every header row in this column is `shrink-0` (it must not be squeezed by
    // the square below it), so a class carrying both `shrink-0` and vertical
    // padding is a header that has grown past its line box.
    expect(markup).not.toMatch(/class="[^"]*\bshrink-0\b[^"]*\bpy-\d[^"]*"/)
    expect(markup).not.toMatch(/class="[^"]*\bpy-\d[^"]*\bshrink-0\b[^"]*"/)

    // And a hand-written pixel height is how both skeletons grew to 48 and 55.
    // Only header-sized values are banned (33…99): the lightbox inside
    // `ConceptPreviewSlider` is legitimately `h-[860px]` and lives in a
    // `Teleport to="body"`, outside this column entirely, and the empty state
    // of `ConceptMobilePreview` is a `min-h-[400px]` floor, not a header.
    expect(markup).not.toMatch(/(?<![a-z-])h-\[(?:3[3-9]|[4-9]\d)px\]/)
  })

  it('reserves the same 32 in the skeletons as the real header takes', () => {
    expect(PREVIEW_HEADER_RESERVE_CLASS).toBe('h-8')
    expect(read('components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue')).toContain(
      'PREVIEW_HEADER_RESERVE_CLASS'
    )
  })

  it('keeps the gap under the header at the kit 24', () => {
    expect(MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS).toBe('gap-6')
    for (const file of RIGHT_SLOT_FILES) {
      // Every right-slot root is a column at `gap-6`; a different gap moves the
      // square by the difference, the same way a wrong header does.
      expect(withoutComments(read(file))).toMatch(/gap-6|MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS/)
    }
  })

  it('is the same 32 and 24 the column width is derived from', () => {
    // If these two ever move, the header and the gap above have to move with
    // them — they are the same numbers, written once here and once in markup.
    expect(WIZARD_PREVIEW_HEADER_HEIGHT).toBe(32)
    expect(WIZARD_PREVIEW_GAP).toBe(24)
  })
})
