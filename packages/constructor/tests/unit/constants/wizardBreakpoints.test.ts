import { describe, it, expect } from 'vitest'
import {
  WIZARD_CAPPED_MIN_WIDTH,
  WIZARD_FRAME_INSET,
  WIZARD_FRAME_MAX_HEIGHT,
  WIZARD_FRAME_MAX_WIDTH,
  resolvePreviewMaxSide,
  resolveWizardPaneGeometry,
} from '@/constants/wizardResponsive'

/**
 * The WHOLE chain, browser window → columns — Figma `5395:118197`.
 *
 * `wizardResponsive.test.ts` pins the formula. It passed while the product was
 * still wrong, because nothing checked what feeds the formula: the owner set
 * the designer's breakpoints and got 567 · 503 where the mockup says 479 · 591.
 * The formula was right; the height handed to it was 88 short, because the
 * Admin drew its own header above the wizard and the kit draws none.
 *
 * So this file starts from the browser viewport and walks every subtraction:
 *
 *   sidebar        210 below 1920, 250 from 1920      (`5395:119181`)
 *   wizard width   viewport width − sidebar
 *   wizard header  73, on all four frames             (`5382:30951`)
 *   frame inset    48 top + 48 bottom, only above 1920 (`5395:119537`)
 *   frame height   capped at 960 above 1920            (`5395:119538`)
 *   square         min(height − 120, the size drawn for the breakpoint)
 *   columns        right = square + 64, left = the rest
 *
 * Verified to fail, not assumed to: put the Admin header back (subtract 88
 * from the viewport height) and every one of the five rows goes red.
 */

/** Kit `Sidebar`: 210 up to 1920, 250 from 1920. */
const SIDEBAR_WIDTH_AT_1920 = 250
const SIDEBAR_WIDTH_BELOW_1920 = 210
const SIDEBAR_BREAKPOINT = 1920

/** Kit `Wizard header` `5382:30951` — 73 on every frame. */
const WIZARD_HEADER_HEIGHT = 73

interface Layout {
  wizardWidth: number
  frameHeight: number
  previewSide: number
  rightPaneWidth: number
  rightPaneHeight: number
  leftPaneWidth: number
}

/**
 * What the product must produce for a given browser window, with the Admin
 * header gone — the whole point of the hidden-header change.
 */
function layoutForViewport(viewportWidth: number, viewportHeight: number): Layout {
  const sidebar =
    viewportWidth >= SIDEBAR_BREAKPOINT ? SIDEBAR_WIDTH_AT_1920 : SIDEBAR_WIDTH_BELOW_1920
  const wizardWidth = viewportWidth - sidebar
  const contentHeight = viewportHeight - WIZARD_HEADER_HEIGHT

  const capped = wizardWidth >= WIZARD_CAPPED_MIN_WIDTH
  const frameWidth = capped ? Math.min(wizardWidth, WIZARD_FRAME_MAX_WIDTH) : wizardWidth
  const frameHeight = capped
    ? Math.min(contentHeight - WIZARD_FRAME_INSET * 2, WIZARD_FRAME_MAX_HEIGHT)
    : contentHeight

  const { previewSide, rightPaneWidth, rightPaneHeight } = resolveWizardPaneGeometry(
    frameHeight,
    { capped, maxSide: resolvePreviewMaxSide(frameWidth) }
  )

  return {
    wizardWidth,
    frameHeight,
    previewSide,
    rightPaneWidth,
    rightPaneHeight,
    leftPaneWidth: frameWidth - rightPaneWidth,
  }
}

/** The five frames the designer drew, each with the numbers she drew. */
const FRAMES = [
  {
    name: 'Wizard 1280 px `5395:119360`',
    viewport: [1280, 720],
    wizardWidth: 1070,
    left: 479,
    right: 591,
    preview: 527,
  },
  {
    name: 'Wizard 1440 px `5395:118730`',
    viewport: [1440, 768],
    wizardWidth: 1230,
    left: 591,
    right: 639,
    preview: 575,
  },
  {
    name: 'Wizard 1920 px `5395:119180`',
    viewport: [1920, 920],
    wizardWidth: 1670,
    left: 879,
    right: 791,
    preview: 727,
  },
  {
    name: 'Wizard 2560 px `5395:119533`',
    viewport: [2560, 1300],
    wizardWidth: 2310,
    left: 796,
    right: 904,
    preview: 840,
  },
  {
    name: 'Wizard 2560 px, low viewport `5395:119983`',
    viewport: [2560, 884],
    wizardWidth: 2310,
    left: 896,
    right: 804,
    preview: 740,
  },
] as const

describe('every drawn breakpoint reproduces, viewport in, columns out', () => {
  it.each(FRAMES)('$name', ({ viewport, wizardWidth, left, right, preview }) => {
    const layout = layoutForViewport(viewport[0], viewport[1])

    expect(layout.wizardWidth).toBe(wizardWidth)
    expect(layout.previewSide).toBe(preview)
    expect(layout.rightPaneWidth).toBe(right)
    expect(layout.leftPaneWidth).toBe(left)
  })

  it('caps the frame at 1700 above 1920 and fills the panel below it', () => {
    // 2560 − 250 = 2310 of panel, but the frame is 1700 and centred.
    expect(layoutForViewport(2560, 1300).leftPaneWidth + layoutForViewport(2560, 1300).rightPaneWidth)
      .toBe(WIZARD_FRAME_MAX_WIDTH)
    // 1920 − 250 = 1670, which is NOT capped: "більше 1920 px" on the sticker.
    expect(layoutForViewport(1920, 920).leftPaneWidth + layoutForViewport(1920, 920).rightPaneWidth)
      .toBe(1670)
  })

  it('widens the sidebar at 1920 and not before', () => {
    expect(layoutForViewport(1919, 920).wizardWidth).toBe(1919 - SIDEBAR_WIDTH_BELOW_1920)
    expect(layoutForViewport(1920, 920).wizardWidth).toBe(1920 - SIDEBAR_WIDTH_AT_1920)
  })
})

describe('what the Admin header used to cost', () => {
  const ADMIN_HEADER_HEIGHT = 88 // padding 24 + the 39 back button + 24 + the 1px rule

  it('took 88 off the right column at every size, which is what the owner saw', () => {
    const withHeader = resolveWizardPaneGeometry(720 - ADMIN_HEADER_HEIGHT - WIZARD_HEADER_HEIGHT)
    // 720 − 88 − 73 = 559 → 503, against the 591 the mockup draws. And the left
    // column swallowed the difference: 1070 − 503 = 567, against 479.
    expect(withHeader.rightPaneWidth).toBe(503)
    expect(1070 - withHeader.rightPaneWidth).toBe(567)

    // Without it, the same window lands exactly on the drawn frame.
    expect(layoutForViewport(1280, 720).rightPaneWidth).toBe(591)
    expect(layoutForViewport(1280, 720).leftPaneWidth).toBe(479)
  })
})


/**
 * The regression this whole file exists for, twice over.
 *
 * The first shipped version had no ceiling on the square, so the columns moved
 * with the WINDOW HEIGHT: at 1440×900 the left column came out 459 against the
 * 591 the kit draws, and at 1920×1080 it was 719 against 879. The owner found
 * it by setting sizes by hand.
 *
 * The 29 screens are what settles it, and each row below is one of them: same
 * 1440 width, five different content heights, one answer.
 */
describe('a taller window must not move the columns', () => {
  const TALLER = [
    { name: '1440×768  — the frame she drew', viewport: [1440, 768] },
    { name: '1440×786  — step 4 `5382:48408`, content 713', viewport: [1440, 786] },
    { name: '1440×900  — the size the owner tested', viewport: [1440, 900] },
    { name: '1440×858  — step 4 in the edit flow, content 785', viewport: [1440, 858] },
    { name: '1440×1200 — taller than anything drawn', viewport: [1440, 1200] },
  ] as const

  it.each(TALLER)('$name keeps 591 · 639 and a 575 square', ({ viewport }) => {
    const layout = layoutForViewport(viewport[0], viewport[1])
    expect(layout.previewSide).toBe(575)
    expect(layout.rightPaneWidth).toBe(639)
    expect(layout.leftPaneWidth).toBe(591)
  })

  it('leaves the extra height as white space, not as a stretched panel', () => {
    // `5382:48440` is 639×695 inside a 713-tall row; `5387:105207` the same
    // inside 785. The panel stops at the square plus its 120 of chrome.
    expect(layoutForViewport(1440, 768).rightPaneHeight).toBe(695)
    expect(layoutForViewport(1440, 1200).rightPaneHeight).toBe(695)
  })

  it('holds 879 · 791 at 1920 whatever the window height', () => {
    for (const height of [920, 1000, 1080, 1440]) {
      const layout = layoutForViewport(1920, height)
      expect(layout.previewSide).toBe(727)
      expect(layout.leftPaneWidth).toBe(879)
      expect(layout.rightPaneWidth).toBe(791)
    }
  })

  it('still shrinks when the window is SHORTER than the one she drew', () => {
    // Downward is the one direction height moves the layout, and it is the
    // only one the sticker describes.
    const short = layoutForViewport(1440, 600)
    expect(short.previewSide).toBe(600 - 73 - 120)
    expect(short.previewSide).toBeLessThan(575)
  })

  it('carries the ceilings the designer drew, and no invented ones', () => {
    expect(resolvePreviewMaxSide(1070)).toBe(527) // 1280 − 210
    expect(resolvePreviewMaxSide(1230)).toBe(575) // 1440 − 210
    expect(resolvePreviewMaxSide(1670)).toBe(727) // 1920 − 250
    expect(resolvePreviewMaxSide(1700)).toBe(840) // the capped frame
  })
})
