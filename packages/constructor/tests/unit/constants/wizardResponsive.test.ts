import { describe, it, expect } from 'vitest'
import {
  fitPhoneBoxRem,
  WIZARD_CAPPED_MIN_WIDTH,
  WIZARD_CONCEPT_COLUMNS,
  WIZARD_FRAME_INSET,
  WIZARD_FRAME_MAX_HEIGHT,
  WIZARD_FRAME_MAX_WIDTH,
  WIZARD_PANE_PADDING,
  WIZARD_PREVIEW_MIN_SIDE,
  WIZARD_PREVIEW_VERTICAL_CHROME,
  WIZARD_RIGHT_PANE_MIN_WIDTH,
  resolveWizardPaneGeometry,
} from '@/constants/wizardResponsive'

/**
 * The responsive formula — Figma `Responsive behavior` `5395:118197`.
 *
 * Until this work the wizard scaled as one piece from a root font-size, and
 * there was nothing to test: the only number was the clamp. Now the columns
 * are arithmetic, so the arithmetic is pinned here against the five drawn
 * frames. Every row below is a measurement, not a derivation of the plan.
 *
 * Verified to fail, not assumed to: change the chrome from 120 to 112 and four
 * of the five frames go red; drop the 740 floor and the short-viewport frame
 * goes red on its own.
 */

/** The five frames of the section, each as (pane height → left · right). */
const FRAMES = [
  { name: '1280×720  `5395:119360`', paneHeight: 647, wizard: 1070, right: 591, preview: 527, maxSide: 527 },
  { name: '1440×768  `5395:118730`', paneHeight: 695, wizard: 1230, right: 639, preview: 575, maxSide: 575 },
  { name: '1920×920  `5395:119180`', paneHeight: 847, wizard: 1670, right: 791, preview: 727, maxSide: 727 },
  { name: '2560×1300 `5395:119533`', paneHeight: 960, wizard: 1700, right: 904, preview: 840, maxSide: 840, capped: true },
  { name: '2560×884  `5395:119983`', paneHeight: 715, wizard: 1700, right: 804, preview: 740, maxSide: 840, capped: true },
] as const

describe('the right column is the driver, and it comes from the height', () => {
  it.each(FRAMES)('$name', ({ paneHeight, right, preview, capped, maxSide }) => {
    const geometry = resolveWizardPaneGeometry(paneHeight, { capped: Boolean(capped), maxSide })
    expect(geometry.previewSide).toBe(preview)
    expect(geometry.rightPaneWidth).toBe(right)
  })

  it('leaves the left column the remainder, which is what the frames show', () => {
    // The kit gives the left column `flex: 1 0 0`; these are the widths that
    // fall out of it, and they are the ones drawn.
    const lefts = FRAMES.map(frame => frame.wizard - frame.right)
    expect(lefts).toEqual([479, 591, 879, 796, 896])
  })

  it('spends the 120 on padding, header and gap — nothing else', () => {
    expect(WIZARD_PREVIEW_VERTICAL_CHROME).toBe(120)
    expect(WIZARD_PANE_PADDING).toBe(32)
    // right = preview + the two horizontal paddings = height − 56, as long as
    // the height is exactly the one the breakpoint was drawn at.
    expect(resolveWizardPaneGeometry(695, { maxSide: 575 }).rightPaneWidth).toBe(695 - 56)
  })
})

describe('the 740 floor belongs to the capped regime only', () => {
  it('holds the square at 740 and lets the column scroll above 1920', () => {
    // `5395:119983`: 715 − 120 = 595, and the designer kept the square at 740.
    expect(resolveWizardPaneGeometry(715, { capped: true, maxSide: 840 }).previewSide).toBe(
      WIZARD_PREVIEW_MIN_SIDE
    )
  })

  it('does not shrink the square below 1920 at all — it scrolls', () => {
    // Below 1920 the drawn size is both the ceiling AND the floor: a short
    // window leaves the column exactly where it was and scrolls inside it,
    // which is what it already does to the left column. Letting the square
    // shrink there made the right column narrow and the concept tiles grow.
    expect(resolveWizardPaneGeometry(715, { maxSide: 575 }).previewSide).toBe(575)
    expect(resolveWizardPaneGeometry(400, { maxSide: 575 }).previewSide).toBe(575)
    // And the panel never claims more height than the row it sits in.
    expect(resolveWizardPaneGeometry(400, { maxSide: 575 }).rightPaneHeight).toBe(400)
  })
})

describe('bad input never collapses a column', () => {
  it.each([0, -50, Number.NaN, Number.POSITIVE_INFINITY, WIZARD_PREVIEW_VERTICAL_CHROME])(
    'returns 0 for %s so the caller keeps the CSS default',
    height => {
      expect(resolveWizardPaneGeometry(height, { maxSide: 575 }).rightPaneWidth).toBe(0)
    }
  )

  it('never returns a column narrower than the floor once it returns one', () => {
    expect(resolveWizardPaneGeometry(130, { maxSide: 1 }).rightPaneWidth).toBe(
      WIZARD_RIGHT_PANE_MIN_WIDTH
    )
  })
})

describe('thresholds are the wizard width, not the browser width', () => {
  it('starts the capped frame one pixel past the 1920 breakpoint', () => {
    // 1920 − 250 sidebar = 1670, and the sticker says "більше 1920 px".
    expect(WIZARD_CAPPED_MIN_WIDTH).toBe(1671)
  })

  it('carries the kit frame numbers verbatim', () => {
    expect(WIZARD_FRAME_MAX_WIDTH).toBe(1700)
    expect(WIZARD_FRAME_MAX_HEIGHT).toBe(960)
    expect(WIZARD_FRAME_INSET).toBe(48)
  })

  it('counts concept columns 3 / 4 / 5', () => {
    expect(WIZARD_CONCEPT_COLUMNS).toEqual({ base: 3, at1440: 4, at1920: 5 })
  })
})


describe('the phone previews shrink into the square instead of being cropped', () => {
  const STEP7 = { designWidthPx: 298.9702453613281, designHeightPx: 650 }
  const REVIEW = {
    designWidthPx: 239.1761932373047,
    designHeightPx: 520,
    count: 2,
    gapPx: 32,
  }

  it('leaves the step-7 phone alone once the square is big enough', () => {
    // 1920×920 → square 727, and 650 fits with room.
    expect(fitPhoneBoxRem(727, STEP7).heightRem * 16).toBe(650)
    // Exactly at 650 it is still untouched.
    expect(fitPhoneBoxRem(650, STEP7).heightRem * 16).toBe(650)
  })

  it('shrinks it at the breakpoints where the square is smaller than the phone', () => {
    // 1440×768 → square 575: the phone is 650 and used to scroll the column.
    const at1440 = fitPhoneBoxRem(575, STEP7)
    expect(at1440.heightRem * 16).toBeCloseTo(575, 4)
    // 1280×720 → square 527.
    expect(fitPhoneBoxRem(527, STEP7).heightRem * 16).toBeCloseTo(527, 4)
  })

  it('keeps the proportions exactly, on both axes', () => {
    const design = STEP7.designWidthPx / STEP7.designHeightPx
    for (const side of [527, 575, 400, 200]) {
      const box = fitPhoneBoxRem(side, STEP7)
      expect(box.widthRem / box.heightRem).toBeCloseTo(design, 10)
    }
  })

  it('fits the review PAIR, gap included, not one phone', () => {
    // The pair is 2 × 239.18 + 32 = 510.35, so it survives untouched down to a
    // 575 and a 527 square — the two smallest the kit draws.
    expect(fitPhoneBoxRem(575, REVIEW).widthRem * 16).toBeCloseTo(239.176, 2)
    expect(fitPhoneBoxRem(527, REVIEW).widthRem * 16).toBeCloseTo(239.176, 2)

    // Below that, both constraints are live and the tighter one wins. At a 400
    // square the HEIGHT binds (520 > 400), so the phones come out 400 tall and
    // the pair lands just inside the width. The 32 gap is NOT scaled: it is a
    // kit spacing, and kit spacings are the things this work holds fixed.
    const tight = fitPhoneBoxRem(400, REVIEW)
    expect(tight.heightRem * 16).toBeCloseTo(400, 4)
    expect(tight.widthRem * 16 * 2 + 32).toBeLessThanOrEqual(400)

    // And where the WIDTH binds instead, the pair fills the square exactly.
    const wide = fitPhoneBoxRem(300, { ...REVIEW, designHeightPx: 200 })
    expect(wide.widthRem * 16 * 2 + 32).toBeCloseTo(300, 4)
  })

  it('returns the design size before the first measurement', () => {
    for (const side of [0, -1, Number.NaN]) {
      expect(fitPhoneBoxRem(side, STEP7).heightRem * 16).toBe(650)
    }
  })
})
