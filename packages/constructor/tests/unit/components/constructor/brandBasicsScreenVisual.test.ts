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
import {
  UI_BADGE_CHIP_GROUP_CLASS,
  UI_BADGE_CHIP_ROOT_CLASS,
  UI_BADGE_ROOT_CLASS,
  UI_BADGE_TONES,
  resolveUiBadgeClasses,
} from '@/components/ui/uiBadge'
import { UI_FIELD_TYPE_FLUID_CLASS } from '@/components/ui/uiField'

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

describe('the GEO chips — the part of this screen that was never compared', () => {
  // The owner found these on acceptance. Both numbers came back in the very
  // first read of `5409:35822` and were never checked against the code,
  // because the chips were not on the list of things being checked. The list
  // was the defect, so the chips are pinned here rather than anywhere else.
  const geo = body(read('components/constructor/fields/GeoMultiSelect.vue'))

  it('draws them square-cornered on bg/alt-4, not as the badge pill', () => {
    // `5409:36376` — 50×24, radius 4, #dfdfe2. The badge symbol `3453:1619` is
    // radius 1000 on `badge/bg/neutral` #eaeaeb and stays that way for the
    // other five call sites.
    expect(UI_BADGE_CHIP_ROOT_CLASS).toContain('rounded-sm')
    expect(UI_BADGE_CHIP_ROOT_CLASS).toContain('bg-ink-400')
    expect(UI_BADGE_CHIP_ROOT_CLASS).not.toContain('rounded-full')
    expect(UI_BADGE_CHIP_ROOT_CLASS).not.toContain('bg-ink-300')
    expect(geo).toContain('shape="chip"')
  })

  it('keeps the pill for everything that is still drawn as one', () => {
    expect(UI_BADGE_ROOT_CLASS).toContain('rounded-full')
    expect(UI_BADGE_TONES.neutral).toContain('bg-ink-300')
    expect(resolveUiBadgeClasses('neutral').root).toContain('rounded-full')
    expect(resolveUiBadgeClasses('neutral', 'chip').root).toContain('rounded-sm')
  })

  it('never puts two fills on the one chip', () => {
    // Which of `bg-ink-300` and `bg-ink-400` wins is Tailwind's output order,
    // not the order they are written — the accordion lesson. So the shape
    // replaces the tone's fill instead of layering over it.
    const chip = resolveUiBadgeClasses('neutral', 'chip').root
    expect(chip.match(/\bbg-ink-\d00\b/g) ?? []).toHaveLength(1)
  })

  it('spaces the chips at 4 and leaves the field its 8 to the search input', () => {
    // Chips at x = 0 and 54 in a 102-wide group of 50 and 48; the placeholder
    // opens at 114 against a group ending at 106.
    expect(UI_BADGE_CHIP_GROUP_CLASS).toContain('gap-1')
    // Bound in the template, not merely imported: the import line names the
    // constant too, so a plain `toContain` stayed green with the group ripped
    // out and a bare `flex` in its place. Caught by breaking this on purpose.
    expect(geo).toContain(':class="UI_BADGE_CHIP_GROUP_CLASS"')
    expect(UI_FIELD_TYPE_FLUID_CLASS).toContain('gap-2')
  })

  it('fills the kit 16 icon slot instead of floating a 14 glyph in it', () => {
    expect(geo).toContain('<CloseIcon class="size-4" />')
    expect(geo).not.toContain('size-3.5')
  })

  it('paints the remove glyph in badge/content/neutral', () => {
    // #393947 — the badge's own content token, which the label already used.
    expect(geo).toContain('text-ink-800')
    expect(geo).not.toContain('text-ink-700 transition-colors')
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
