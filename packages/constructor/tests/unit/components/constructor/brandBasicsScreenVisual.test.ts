import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  STEP_ONE_CARD_CLASS,
  STEP_ONE_CARD_ICON_CLASS,
  STEP_ONE_CARD_LABEL_CLASS,
  STEP_ONE_CARD_LIST_CLASS,
  STEP_ONE_CARD_ROW_CLASS,
  STEP_ONE_CARD_TILE_CLASS,
  STEP_ONE_CARD_VALUE_CLASS,
} from '@/constants/stepOnePreviewCard'
import { UI_PROPERTY_LABEL_CLASS, UI_PROPERTY_VALUE_CLASS } from '@/components/ui/uiProperty'
import { UI_SECTION_CARD_BODY_CLASS } from '@/components/ui/uiSectionCard'

/**
 * Step 1 against the drawn screen — `Brand Basics (step 1)` `5409:35822`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5409-35822&m=dev
 *
 * The screen counted as "the designer drew nothing" for the whole project. It
 * is drawn, on the `UXUI-2651` canvas no task links to, and this file pins the
 * eleven numbers that were wrong once it turned up.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the markup is
 * read as text — the idiom of `landingScreenVisual.test.ts` and
 * `reviewScreenVisual.test.ts`. The class map it leans on IS importable, so
 * that half is asserted as values.
 *
 * Shown red by putting each thing back, one at a time: the 24 field gap, the
 * comment field's own 8, the "(необов'язково)" suffix, the kit Section card
 * body padding, the 1px border, `UiProperty` on the cards, the 16 card gap,
 * the bare glyph with no tile, the 16/24 value and the #6f6f7d label.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/** Everything below the doc comments — so a class quoted in prose is not a hit. */
function body(source: string): string {
  return source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

const stepView = body(read('views/wizard/BrandBasicsView.vue'))
const commentField = body(read('components/constructor/fields/StepCommentField.vue'))
const rightPanel = body(read('components/constructor/layout/StepPreviewRightPanel.vue'))

/** The step-1 branch only — the same file renders steps 2, 3/4 and 7. */
const stepOneBranch = (() => {
  const start = rightPanel.indexOf("v-if=\"currentStep === 1\"")
  const end = rightPanel.indexOf("v-else-if=\"currentStep === 2\"")
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return rightPanel.slice(start, end)
})()

describe('left column — four Inputs at a flat spacing/16', () => {
  it('stacks the fields 16 apart, not 24', () => {
    // `5409:36106` puts its Inputs at y = 0, 96, 192, 288 and an Input is 80
    // tall, so the gap is 96 − 80 = 16.
    expect(stepView).toContain('flex flex-col gap-4')
    expect(stepView).not.toContain('flex flex-col gap-6')
  })

  it('lets the comment field sit at that same 16 instead of 16 + its own 8', () => {
    expect(stepView).toContain('<StepCommentField v-model="comment" flush />')
  })

  it('titles the comment field «Коментар» and nothing else', () => {
    // The kit Title on `5409:35844` is the bare word. "(необов'язково)" was ours.
    expect(stepView).not.toContain('optional')
  })

  it('keeps the 8 as the default for the fifteen screens that measure 32 with it', () => {
    expect(commentField).toContain("'step-comment-field pt-2 flex flex-col gap-2'")
    expect(commentField).toContain("'step-comment-field flex flex-col gap-2'")
  })

  it('never puts two padding-top utilities on the one element', () => {
    // Which of `pt-2` and a cancelling `pt-0` wins is decided by Tailwind's own
    // output order, not by the order they are written — the way the accordion
    // lost its selected border. So the class is chosen, not layered.
    expect(commentField).not.toContain('pt-0')
  })
})

describe('right column — the two drawn summary cards', () => {
  it('spaces neighbouring cards at 24', () => {
    // Card 124 tall at y = 32, the next at y = 180.
    expect(STEP_ONE_CARD_LIST_CLASS).toBe('flex flex-col gap-6')
    expect(stepOneBranch).toContain('STEP_ONE_CARD_LIST_CLASS')
  })

  it('gives the card 24 of padding and a 2px border', () => {
    // Inset 26 = padding 24 + the card's own 2 of stroke.
    expect(STEP_ONE_CARD_CLASS).toContain('p-6')
    expect(STEP_ONE_CARD_CLASS).toContain('border-2')
    expect(STEP_ONE_CARD_CLASS).toContain('border-ink-300')
    expect(STEP_ONE_CARD_CLASS).toContain('rounded-2xl')
    expect(STEP_ONE_CARD_CLASS).toContain('box-border')
    // The kit Section card's own body padding is 16 and it used to stand here.
    expect(STEP_ONE_CARD_CLASS).not.toContain(UI_SECTION_CARD_BODY_CLASS)
  })

  it('puts 12 between the glyph row and the value', () => {
    // Row 26–62, value at y = 74.
    expect(STEP_ONE_CARD_CLASS).toContain('gap-3')
  })

  it('sits the 20 glyph in a 36 tile on bg/alt-3, not bare', () => {
    expect(STEP_ONE_CARD_TILE_CLASS).toContain('bg-ink-300')
    expect(STEP_ONE_CARD_TILE_CLASS).toContain('rounded-lg')
    // 36 = the 20 glyph + 8 of padding on each side.
    expect(STEP_ONE_CARD_TILE_CLASS).toContain('p-2')
    expect(STEP_ONE_CARD_ICON_CLASS).toContain('size-5')
    expect(stepOneBranch).toContain('STEP_ONE_CARD_TILE_CLASS')
  })

  it('draws the label in content/primary at 14/16, not the Property grey', () => {
    expect(STEP_ONE_CARD_LABEL_CLASS).toContain('text-sm/4')
    expect(STEP_ONE_CARD_LABEL_CLASS).toContain('font-medium')
    expect(STEP_ONE_CARD_LABEL_CLASS).toContain('text-ink-900')
    expect(STEP_ONE_CARD_LABEL_CLASS).not.toContain('text-ink-700')
    // Property paints this same line #6f6f7d, which is what it carried here.
    expect(UI_PROPERTY_LABEL_CLASS).toContain('text-ink-700')
  })

  it('draws the value at header/s 18/24, full width and not indented', () => {
    expect(STEP_ONE_CARD_VALUE_CLASS).toContain('text-lg/6')
    expect(STEP_ONE_CARD_VALUE_CLASS).toContain('font-medium')
    expect(STEP_ONE_CARD_VALUE_CLASS).toContain('w-full')
    // Property's value is body/regular 16/24 and lives in the column beside the
    // glyph, i.e. 28 to the right of where `5409:36424` draws it.
    expect(UI_PROPERTY_VALUE_CLASS).toContain('text-base')
    expect(STEP_ONE_CARD_VALUE_CLASS).not.toContain('text-base')
  })

  it('renders the cards from this map and not from UiProperty', () => {
    expect(stepOneBranch).toContain('STEP_ONE_CARD_ROW_CLASS')
    expect(stepOneBranch).toContain('STEP_ONE_CARD_VALUE_CLASS')
    expect(stepOneBranch).not.toContain('<UiProperty')
    expect(STEP_ONE_CARD_ROW_CLASS).toContain('items-center')
    expect(STEP_ONE_CARD_ROW_CLASS).toContain('gap-2')
  })

  it('leaves the review screen on the kit components it IS drawn with', () => {
    const review = body(read('components/constructor/review/ReviewUnifiedView.vue'))
    expect(review).toContain('<UiProperty')
  })

  it('still opens with the first card and no «Превʼю» header', () => {
    // `5409:36419` starts at y = 32 of the panel — the panel's own padding, no
    // header row above it. Re-pinned here because work 6 added one by
    // inference and the drawn screen took it away again.
    expect(stepOneBranch).not.toContain('PREVIEW_PANEL_HEADER_CLASS')
    expect(stepOneBranch).not.toContain('Превʼю')
  })
})

describe('the two numbers of the drawn screen that are deliberately NOT taken', () => {
  it('lets the card fill the panel instead of freezing at her 543', () => {
    // Panel 639 − 2×32 = 575, and she draws 543 — 32 left, 64 right, a pair no
    // rule produces. A fixed width cannot survive the responsive columns
    // either: the panel is 543 at 1280 and 904 at 2560. Divergences row 111.
    expect(STEP_ONE_CARD_CLASS).toContain('w-full')
    expect(STEP_ONE_CARD_CLASS).not.toContain('543')
  })

  it('keeps the value on the product token rather than her untokened black', () => {
    // `5409:36424` returns the header/s type and no colour variable at all, so
    // its fill is a raw #000000, while the same value on the kit's own Section
    // card is `section card/content/value` #1f1f2e. Divergences row 112.
    expect(STEP_ONE_CARD_VALUE_CLASS).toContain('text-ink-900')
    expect(STEP_ONE_CARD_VALUE_CLASS).not.toContain('text-black')
  })
})
