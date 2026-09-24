import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CONCEPT_CARD_BORDER_COLOR_SELECTED,
  CONCEPT_CARD_DIM_OVERLAY_COLOR,
  CONCEPT_CARD_TITLE_GRADIENT,
} from '@/constants/conceptCardVisual'

/**
 * Concept card visuals — Figma `3715:5610`, DP-15258 phase 17.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so this file
 * guards the constants and reads the two `.vue` files as text.
 *
 * The four kit states were measured on the node, not taken from the plan:
 * Default carries the dim overlay and **no border**, Hovered drops the
 * overlay, Selected adds the 2px #030213 frame plus the white inner ring and
 * the check mark, Preview adds the eye mark and nothing else.
 *
 * Verified to fail: hand the default border back, put the 70% stop back into
 * the gradient, or let the card draw its own white circle again.
 */

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const card = read('components/constructor/alternative-selection/ConceptCard.vue')
const grid = read('components/constructor/alternative-selection/ConceptGrid.vue')
const visuals = read('constants/conceptCardVisual.ts')

describe('kit concept card — Figma 3715:5610', () => {
  it('has no border in any state but Selected', () => {
    // `2201:6968`, the node this file used to quote, framed every tile in
    // rgba(3,2,19,0.1). `3715:5610` frames only State=Selected.
    expect(visuals).not.toContain('CONCEPT_CARD_BORDER_COLOR_DEFAULT')
    expect(card).not.toContain('rgba(3,2,19,0.1)')
    expect(card).toContain("isSelected ? 'border-2' : ''")
  })

  it('keeps concept-card/border #030213 on the selected frame', () => {
    expect(CONCEPT_CARD_BORDER_COLOR_SELECTED).toBe('#030213')
  })

  it('keeps concept-card/overlay at 45% — Default dims, Hovered does not', () => {
    expect(CONCEPT_CARD_DIM_OVERLAY_COLOR).toBe('rgba(0,0,0,0.45)')
    expect(card).toContain('group-hover:opacity-0')
  })

  it('runs the title gradient from transparent to 75% at 95%, with no third stop', () => {
    expect(CONCEPT_CARD_TITLE_GRADIENT).toBe(
      'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 95%)'
    )
    // The old middle stop only existed to fake a bottom fade from a box that
    // covered the whole card; the kit puts the gradient on the name row.
    expect(CONCEPT_CARD_TITLE_GRADIENT).not.toContain('70%')
    expect(card).toContain('concept-card__footer')
  })

  it('draws both marks with the kit icon button, not a hand-rolled circle', () => {
    expect(card).toContain('resolveUiIconButtonClasses')
    expect(card).toContain("size: 'S'")
    expect(card).toContain('decorative: true')
    expect(card).not.toContain('border-black/10')
    expect(card).not.toContain('rgba(0,0,0,0.2)')
  })

  it('insets the marks 8, not the 6 the old check used', () => {
    expect(card).toContain('items-start p-2')
    expect(card).not.toContain('left-[6px]')
    expect(card).not.toContain('top-[6px]')
  })

  it('puts the check left and the eye right, and never both at once', () => {
    expect(card).toContain("showEyeMark ? 'justify-end' : 'justify-start'")
    expect(card).toContain('props.showPreviewMark && !props.showCheckmark')
  })

  it('titles the card body/medium 16/24 on one line', () => {
    expect(card).toContain('truncate text-base font-medium text-white')
    // `line-clamp-2` and `truncate` contradicted each other; the kit draws one
    // line with an ellipsis.
    expect(card).not.toContain('line-clamp-2')
  })
})

describe('the grid asks for the Preview state', () => {
  it('marks the previewed-but-unselected card with the eye', () => {
    expect(grid).toContain(
      ':show-preview-mark="isActive(concept.id) && !isSelected(concept.id)"'
    )
  })

  it('keeps the grid and its skeleton on one column count', () => {
    // The named invariant used to be `9rem` under `auto-fill`. The responsive
    // work replaced it: the kit counts columns by breakpoint — 3 / 4 / 5,
    // measured on `5395:119372`, `5395:118745`, `5395:119192`, `5395:119545` —
    // and the card gets smaller as the count grows, which `auto-fill` cannot
    // do. What the invariant protected is unchanged: ONE handle, and the
    // skeleton never diverging from the grid it stands in for.
    const FORMULA = 'repeat(var(--wizard-concept-columns),minmax(0,1fr))'
    expect(grid).toContain(FORMULA)
    const skeleton = read('components/constructor/skeletons/ConceptGridSkeleton.vue')
    expect(skeleton).toContain(FORMULA)
    // `minmax(0,1fr)` is what now keeps a wide card from overflowing a narrow
    // column — the job `min(…,100%)` used to do. Match the TEMPLATE, not the
    // file: both components name the old formula in their prose, and a bare
    // grep reads that comment as a live class (the `my-10` lesson of phase 18).
    expect(grid).not.toContain('repeat(auto-fill')
    expect(skeleton).not.toContain('repeat(auto-fill')
  })
})
