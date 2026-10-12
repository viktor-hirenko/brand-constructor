import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS,
  PREVIEW_HEADER_RESERVE_CLASS,
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_PHONE_ROW_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
} from '@/constants/previewLayout'
import {
  LEFT_PANE_SCROLL_GUTTER_CLASS,
  leftPanelWidthClass,
  rightPaneClass,
} from '@/components/constructor/layout/dualPaneLayoutClasses'
import { WIZARD_PREVIEW_HEADER_HEIGHT, WIZARD_PREVIEW_GAP } from '@/constants/wizardResponsive'

/**
 * The right column of the wizard — kit `Preview panel` `3839:9513`.
 *
 * Two things this file holds, and they are the same thing seen twice.
 *
 * **The header is 32 and it is PINNED.** The kit's `Header` is the 24/32 name
 * row and nothing else, and the column's WIDTH is derived from its height by
 * subtracting exactly 120 — two 32 paddings, a 32 header and a 24 gap
 * (`wizardResponsive.ts`). A header that is not 32 silently steals the
 * difference from the square and the column stops matching its own width;
 * three of them were 48, 48 and 55 and nobody noticed for the length of the
 * responsive work.
 *
 * **Only the square scrolls.** Owner's decision, divergences row 94: the pane
 * no longer scrolls as a whole, so the name stays on screen while the picture
 * under it moves. That only holds while the header is a SIBLING of the scroll
 * area rather than a child of it — which is what the ordering check below is
 * for — and while the pane itself is `overflow-hidden`.
 *
 * The checks are deliberately crude — source text, not layout — because this
 * package has no jsdom (`vitest.config.ts:11` is `environment: 'node'`). It is
 * the shapes that went wrong, every time.
 *
 * Verified to fail, not assumed to: put `py-2` back on `ConceptMobilePreview`,
 * put `h-[48px]` back on the slider skeleton, give the pane back its
 * `overflow-y-auto`, or move a header inside its scroll area, and this file
 * goes red.
 */

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/** The prose in these files quotes the old values; measure the markup only. */
const withoutComments = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Just the template.
 *
 * The import list names every constant once, in alphabetical order, so any
 * check that reads positions has to start below it — the first version of the
 * ordering check below was measuring the imports and passed on a file whose
 * header really had moved inside the scroll area.
 */
const templateOf = (source: string): string => source.slice(source.indexOf('<template>'))

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
    // `Teleport to="body"`, outside this column entirely.
    expect(markup).not.toMatch(/(?<![a-z-])h-\[(?:3[3-9]|[4-9]\d)px\]/)
  })

  it('states the 32 and the 24 once, and they are the kit numbers', () => {
    expect(PREVIEW_PANEL_HEADER_CLASS).toContain('h-8')
    expect(PREVIEW_PANEL_HEADER_CLASS).toContain('shrink-0')
    expect(PREVIEW_HEADER_RESERVE_CLASS).toBe('h-8')
    expect(MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS).toBe('gap-6')
    // The root spends that same gap between the header and the scroll area, so
    // there is one place where the 24 lives.
    expect(PREVIEW_PANEL_ROOT_CLASS).toContain(MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS)
  })

  it('is the same 32 and 24 the column width is derived from', () => {
    // If these two ever move, the header and the gap above have to move with
    // them — they are the same numbers, written once here and once in markup.
    expect(WIZARD_PREVIEW_HEADER_HEIGHT).toBe(32)
    expect(WIZARD_PREVIEW_GAP).toBe(24)
  })
})

describe('only the square scrolls — the header stays put (row 94)', () => {
  /**
   * `ConceptPreviewSlider` is also the concept-gallery drawer, which is not
   * this column at all — it brings its own header and padding — so it routes
   * the two shared classes through a computed that swaps them out in that one
   * case. The names are accepted here, and the swap itself is pinned below.
   */
  const SCROLL = /PREVIEW_PANEL_SCROLL_CLASS|scrollAreaClass/
  const SQUARE = /PREVIEW_PANEL_SQUARE_CLASS|squareClass/

  it.each(RIGHT_SLOT_FILES)('%s builds the panel out of the shared three parts', file => {
    const markup = templateOf(withoutComments(read(file)))
    expect(markup).toContain('PREVIEW_PANEL_ROOT_CLASS')
    expect(markup).toMatch(SCROLL)
    expect(markup).toMatch(SQUARE)

  })

  it('gives BOTH branches of the slider a scroll area, not just the empty one', () => {
    // `ConceptPreviewSlider` is the only right-slot file whose two branches —
    // empty state and picture — are separate subtrees, so each needs its own
    // wrapper. The first version of the check above was satisfied by the empty
    // branch alone and stayed green with the picture's wrapper deleted, which
    // is the branch that actually overflows.
    const markup = templateOf(
      withoutComments(read('components/constructor/preview/ConceptPreviewSlider.vue'))
    )
    expect((markup.match(/scrollAreaClass/g) ?? []).length).toBe(2)
    // One box per branch, and since DP-15450 they are no longer the same box:
    // the picture's box takes the shape of the picture inside the gallery
    // drawer, while the empty state has no picture and keeps the whole area.
    // What the count guards is unchanged — neither branch may lose its box.
    expect((markup.match(/\bsquareClass\b/g) ?? []).length).toBe(1)
    expect((markup.match(/\bplaceholderBoxClass\b/g) ?? []).length).toBe(1)
  })

  it('lets the slider swap those two only for the drawer, and for nothing else', () => {
    const script = read('components/constructor/preview/ConceptPreviewSlider.vue')
    expect(script).toMatch(/props\.hideHeader \? .* : PREVIEW_PANEL_SCROLL_CLASS/)
    expect(script).toMatch(/props\.hideHeader \? .* : PREVIEW_PANEL_SQUARE_CLASS/)
  })

  it.each(RIGHT_SLOT_FILES)('%s keeps its header OUTSIDE the scroll area', file => {
    // A header nested inside the scroll area scrolls away with the square —
    // which is precisely the defect row 94 is about. In source order the
    // header has to open before the scroll area does.
    const markup = templateOf(withoutComments(read(file)))
    const header = markup.indexOf('PREVIEW_PANEL_HEADER_CLASS')
    const scroll = markup.search(SCROLL)
    expect(header).toBeGreaterThan(-1)
    expect(scroll).toBeGreaterThan(-1)
    expect(header).toBeLessThan(scroll)
  })

  it('leaves the scrolling to the panel, not to the pane', () => {
    // The pane used to be the scroll container, which is what carried the
    // header away. Every mode of it is `overflow-hidden` now.
    for (const mode of ['wizard', 'edit', 'review'] as const) {
      expect(rightPaneClass(mode)).toContain('overflow-hidden')
      expect(rightPaneClass(mode)).not.toContain('overflow-y-auto')
      // And the drawn bar moved with the scrolling, off the pane and onto the
      // area around the square.
      expect(rightPaneClass(mode)).not.toContain('wizard-scrollbar')
    }
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('overflow-y-auto')
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('wizard-scrollbar')
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('flex-1')
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('min-h-0')
  })

  it('keeps the horizontal 32 off the pane so the bar can float in it', () => {
    // `5396:120156`: the bar sits 4 in from the PANE edge and 22 clear of the
    // square, i.e. inside the pane's own padding. That only works if the pane
    // carries no horizontal padding and the scroll area spans it edge to edge.
    for (const mode of ['wizard', 'edit', 'review'] as const) {
      expect(rightPaneClass(mode)).toContain('pt-8')
      expect(rightPaneClass(mode)).not.toMatch(/(?<![a-z-])p-8\b/)
      expect(rightPaneClass(mode)).not.toMatch(/(?<![a-z-])px-8\b/)
    }
    expect(PREVIEW_PANEL_HEADER_CLASS).toContain('px-8')
  })

  it('keeps the bottom 32 INSIDE the scrolling area, not under it', () => {
    // 12.10.2026, the owner on a landscape phone: «этот нижний отступ, он тогда
    // логически не нужен». With the 32 on the pane, a preview too tall for the
    // window was cut off 32 above the pane's edge and a white band stood under
    // it for good. Inside the scrolling area the same 32 is the end of the
    // scroll: a preview that fits looks exactly as before (square + 32), and
    // one that does not runs to the edge.
    for (const mode of ['wizard', 'edit', 'review'] as const) {
      expect(rightPaneClass(mode)).not.toMatch(/(?<![a-z-])py-8\b/)
      expect(rightPaneClass(mode)).not.toMatch(/(?<![a-z-])pb-8\b/)
    }
    expect(PREVIEW_PANEL_SCROLL_CLASS.split(' ')).toContain('pb-8')
  })

  it('pays for the drawn bar with padding, never with the square', () => {
    // Both sides are the kit's 32, so the square is exactly
    // `--wizard-preview-side`: 639 − 64 = 575 at 1440.
    //
    // This was 32 / 22, on the assumption that `scrollbar-gutter: stable`
    // returns the other 10. It returns nothing when the browser draws OVERLAY
    // scrollbars — the macOS default — and the square came out 10 too wide.
    // The left column had the same arithmetic and it cost the concept cards
    // their size, so neither column may reserve a gutter out of its content.
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('px-8')
    expect(PREVIEW_PANEL_SCROLL_CLASS).not.toContain('pr-[')
    expect(LEFT_PANE_SCROLL_GUTTER_CLASS).toBe('px-8')
  })

  it('states the square as a height instead of letting it be flex-1', () => {
    // The whole point of row 90: a `flex-1` box squashes, so the column was
    // sized by a square that was not inside it. The side is published by the
    // shell and taken here as a definite height.
    expect(PREVIEW_PANEL_SQUARE_CLASS).toContain('wizard-preview-square')
    const css = readFileSync(`${SRC}styles/app.css`, 'utf8')
    expect(css).toMatch(/\.wizard-preview-square\s*\{[^}]*height:\s*var\(--wizard-preview-side/)
  })

  it('stands the phone 24 below the top of the square, not in its middle', () => {
    // `5382:64270` (step 7) and `5387:91948` (the review) both open their
    // phones at y=24 of the square. Centring it vertically was nobody's number.
    expect(PREVIEW_PANEL_PHONE_ROW_CLASS).toContain('items-start')
    expect(PREVIEW_PANEL_PHONE_ROW_CLASS).toContain('pt-6')
    expect(PREVIEW_PANEL_PHONE_ROW_CLASS).not.toContain('items-center')

    // Both panels that draw a phone use it rather than rolling their own.
    for (const file of [
      'components/constructor/preview/BrandPreviewPanel.vue',
      'components/constructor/layout/StepPreviewRightPanel.vue',
    ]) {
      expect(withoutComments(read(file))).toContain('PREVIEW_PANEL_PHONE_ROW_CLASS')
    }
  })

  it('never leaves a branch of the step panel without the pane padding', () => {
    // `StepPreviewRightPanel` is the one right-slot file with several branches
    // (steps 1, 2, 3/4, 7 and the fallback). The pane no longer pads them, so
    // a branch that forgets the scroll area renders edge to edge.
    // The import list names every constant once; count uses, not mentions.
    const markup = templateOf(
      withoutComments(read('components/constructor/layout/StepPreviewRightPanel.vue'))
    )
    const branches = markup.match(/<template v-(?:if|else-if|else)[^>]*>/g) ?? []
    expect(branches.length).toBeGreaterThanOrEqual(5)
    // Steps 1 and 7 and the fallback each open one; steps 2 and 3/4 delegate
    // to the components above, which carry their own.
    const scrolls = markup.match(/PREVIEW_PANEL_SCROLL_CLASS/g) ?? []
    expect(scrolls.length).toBe(3)
  })
})

describe('step 1 has NO preview header — its drawn screen says so', () => {
  const markup = templateOf(
    withoutComments(read('components/constructor/layout/StepPreviewRightPanel.vue'))
  )
  /** Everything up to the step-2 branch, i.e. the step-1 branch alone. */
  const stepOne = markup.slice(0, markup.indexOf("currentStep === 2"))

  it('opens straight into the cards, with no «Превʼю» row', () => {
    // `Brand Basics (step 1)` `5409:35822`, found on the UXUI-2651 canvas after
    // this panel had already been rebuilt: its Right panel opens with the first
    // card at y=32 and carries no header at all. A header was added here on the
    // strength of "the `UI preview` type always has one" — an inference from a
    // component, which a drawn screen outranks. Divergences row 95.
    expect(stepOne).not.toContain('Превʼю')
    expect(stepOne).not.toContain('PREVIEW_PANEL_HEADER_CLASS')
  })

  it('builds its three cards from the drawn screen, not from UiProperty', () => {
    // This assertion used to read the other way round — three `UiProperty`
    // rows, because the same drawn screen had only settled the header at the
    // time and the cards were left on the kit components work 6 reached for.
    // Measuring the cards themselves settled it: `5409:36419` and its siblings
    // are plain frames, and their shape is not Property's — the value sits at
    // the card's own left edge, not in the column beside the glyph. Step 8's
    // review IS drawn with Property and keeps it.
    expect(stepOne).toContain('STEP_ONE_CARD_CLASS')
    expect(stepOne).toContain('STEP_ONE_CARD_TILE_CLASS')
    expect(stepOne).toContain('STEP_ONE_CARD_VALUE_CLASS')
    expect(stepOne.match(/<UiProperty/g) ?? []).toHaveLength(0)
  })

  it('keeps none of the pre-kit card recipe', () => {
    const source = withoutComments(read('components/constructor/layout/StepPreviewRightPanel.vue'))
    expect(source).not.toContain('rounded-[14px]')
    expect(source).not.toContain('shadow-[0px_10px_15px')
    expect(source).not.toContain('border-black/10')
    expect(source).not.toContain('bg-primary/10')
  })
})

describe('the empty preview writes the kit sentence — row 103', () => {
  it('steps 3 and 4 say what step 2 already says', () => {
    const source = withoutComments(
      read('components/constructor/preview/ConceptMobilePreview.vue')
    )
    expect(source).toContain('PREVIEW_PANEL_PLACEHOLDER_TEXT')
    expect(source).not.toContain('Спочатку оберіть концепт')
  })

  it('leaves the ordered-concept case ours, because the kit draws none', () => {
    const source = withoutComments(
      read('components/constructor/preview/ConceptMobilePreview.vue')
    )
    expect(source).toContain('Для замовленого концепту превʼю поки недоступне.')
  })
})
