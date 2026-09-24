import { describe, it, expect } from 'vitest'
import {
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
  { name: '1280×720  `5395:119360`', paneHeight: 647, wizard: 1070, right: 591, preview: 527 },
  { name: '1440×768  `5395:118730`', paneHeight: 695, wizard: 1230, right: 639, preview: 575 },
  { name: '1920×920  `5395:119180`', paneHeight: 847, wizard: 1670, right: 791, preview: 727 },
  { name: '2560×1300 `5395:119533`', paneHeight: 960, wizard: 1700, right: 904, preview: 840, capped: true },
  { name: '2560×884  `5395:119983`', paneHeight: 715, wizard: 1700, right: 804, preview: 740, capped: true },
] as const

describe('the right column is the driver, and it comes from the height', () => {
  it.each(FRAMES)('$name', ({ paneHeight, right, preview, capped }) => {
    const geometry = resolveWizardPaneGeometry(paneHeight, { capped: Boolean(capped) })
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
    // right = preview + the two horizontal paddings = height − 56.
    expect(resolveWizardPaneGeometry(695).rightPaneWidth).toBe(695 - 56)
  })
})

describe('the 740 floor belongs to the capped regime only', () => {
  it('holds the square at 740 and lets the column scroll above 1920', () => {
    // `5395:119983`: 715 − 120 = 595, and the designer kept the square at 740.
    expect(resolveWizardPaneGeometry(715, { capped: true }).previewSide).toBe(
      WIZARD_PREVIEW_MIN_SIDE
    )
  })

  it('shrinks the square all the way below 1920, because the frames do', () => {
    // The same 715 without the cap: the 1280 frame draws a 527 square without
    // complaint, so there is no floor to apply there.
    expect(resolveWizardPaneGeometry(715).previewSide).toBe(595)
  })
})

describe('bad input never collapses a column', () => {
  it.each([0, -50, Number.NaN, Number.POSITIVE_INFINITY, WIZARD_PREVIEW_VERTICAL_CHROME])(
    'returns 0 for %s so the caller keeps the CSS default',
    height => {
      expect(resolveWizardPaneGeometry(height).rightPaneWidth).toBe(0)
    }
  )

  it('never returns a column narrower than the floor once it returns one', () => {
    expect(resolveWizardPaneGeometry(130).rightPaneWidth).toBe(WIZARD_RIGHT_PANE_MIN_WIDTH)
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
