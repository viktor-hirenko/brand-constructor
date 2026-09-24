import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  LEFT_PANE_SCROLL_GUTTER_CLASS,
  leftPanelWidthClass,
} from '@/components/constructor/layout/dualPaneLayoutClasses'
import { PREVIEW_PANEL_SCROLL_CLASS } from '@/constants/previewLayout'
import {
  WIZARD_CAPPED_MIN_WIDTH,
  WIZARD_FRAME_INSET,
  WIZARD_FRAME_MAX_HEIGHT,
  WIZARD_FRAME_MAX_WIDTH,
  resolvePreviewSide,
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
    { previewSide: resolvePreviewSide(frameWidth) }
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
    // She draws 896 · 804 with a 740 square here. We draw 796 · 904 with an
    // 840 square that overflows and scrolls: 740 is `min-height: 860` minus
    // the 120 of chrome, and that `min-height` is already rejected
    // (divergences row 86) because her own frame draws the container 715.
    // Keeping one while rejecting the other is the same number twice.
    name: 'Wizard 2560 px, low viewport `5395:119983` — deliberate divergence',
    viewport: [2560, 884],
    wizardWidth: 2310,
    left: 796,
    right: 904,
    preview: 840,
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
    // Spelled out rather than called: the shipped arithmetic of that day had
    // neither a ceiling nor a floor, and the function no longer accepts that.
    const rowHeight = 720 - ADMIN_HEADER_HEIGHT - WIZARD_HEADER_HEIGHT // 559
    const thenRight = rowHeight - 56

    expect(thenRight).toBe(503) // against the 591 the mockup draws
    expect(1070 - thenRight).toBe(567) // and the left column swallowed the rest

    // Without the header, the same window lands exactly on the drawn frame.
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

  it('does NOT shrink when the window is shorter either — it scrolls', () => {
    // The second defect, and the one the owner spotted by dragging the window
    // shorter: the square shrank, the right column narrowed behind it and the
    // left column swallowed the difference, so the concept tiles GREW as the
    // window got smaller. A short window must do to the right column exactly
    // what it already does to the left one: nothing to its width, and a
    // scrollbar inside. Both drawn columns of `5395:119983` carry a scrollbar.
    for (const height of [646, 560, 505, 443]) {
      const short = layoutForViewport(1440, height)
      expect(short.previewSide).toBe(575)
      expect(short.rightPaneWidth).toBe(639)
      expect(short.leftPaneWidth).toBe(591)
      // The panel can no longer be taller than the row: it scrolls inside.
      expect(short.rightPaneHeight).toBe(height - 73)
    }
  })

  it('keeps 1280 at 479 · 591 however short the window gets', () => {
    for (const height of [720, 600, 500]) {
      const layout = layoutForViewport(1280, height)
      expect(layout.previewSide).toBe(527)
      expect(layout.leftPaneWidth).toBe(479)
    }
  })

  it('holds 796 · 904 above 1920 whatever the window height', () => {
    for (const height of [1440, 1300, 1129, 1029, 884, 757]) {
      const layout = layoutForViewport(2560, height)
      expect(layout.previewSide).toBe(840)
      expect(layout.rightPaneWidth).toBe(904)
      expect(layout.leftPaneWidth).toBe(796)
      // And the square itself never shrinks with the height — it is stated on
      // the box (`--wizard-preview-side`), so a short window scrolls it
      // instead of squashing it into a rectangle.
      expect(layout.previewSide).toBe(840)
    }
  })

  it('shrinks only the PANEL when the row is short, never the square', () => {
    // 884 − 73 header − 96 inset = 715 of frame, and the panel takes all of it
    // while the square still claims 840 inside a scroll area of 715 − 120 =
    // 595 — the 245 difference is the scroll. Her own short frame draws that:
    // `5395:119983` is a 740×740 `Preview` inside a 651-tall `Content`.
    expect(layoutForViewport(2560, 884).rightPaneHeight).toBe(715)
    expect(layoutForViewport(2560, 884).previewSide).toBe(840)
    expect(layoutForViewport(2560, 884).rightPaneHeight - 120).toBe(595)
  })

  it('lands on her number at each of her four widths, to the pixel', () => {
    expect(resolvePreviewSide(1070)).toBe(527) // 1280 − 210
    expect(resolvePreviewSide(1230)).toBe(575) // 1440 − 210
    expect(resolvePreviewSide(1670)).toBe(727) // 1920 − 250
    expect(resolvePreviewSide(1700)).toBe(840) // the capped frame
  })

  it('runs the straight line between her numbers in between', () => {
    // Halfway from 1070 to 1230 is halfway from 527 to 575.
    expect(resolvePreviewSide(1150)).toBe(551)
    // Halfway from 1230 to 1670 is halfway from 575 to 727.
    expect(resolvePreviewSide(1450)).toBe(651)
  })

  it('holds at 527 below her narrowest frame instead of extrapolating down', () => {
    // Otherwise a narrow panel ends up with a right column wider than the left.
    for (const width of [1070, 900, 600, 0]) {
      expect(resolvePreviewSide(width)).toBe(527)
    }
  })

  it('fixes the 16-inch MacBook, which is the window that exposed this', () => {
    // 1728 default scaling − 210 sidebar = 1518 of wizard. Held as a step
    // function it was 879 · 639 — her own 1440 is 591 · 639, almost even, and
    // 879 · 639 is a layout she never drew.
    const layout = layoutForViewport(1728, 899)
    expect(layout.wizardWidth).toBe(1518)
    expect(layout.previewSide).toBe(674)
    expect(layout.rightPaneWidth).toBe(738)
    expect(layout.leftPaneWidth).toBe(780)
  })
})

/**
 * The second half of the chain: pane width → content box → concept cards.
 *
 * The first half above stops at the column widths, and that is exactly where
 * the next defect hid. The owner opened DevTools on the drawn 1440 and found
 * the cards 128 where the kit draws **125.75** — the grid was right, its
 * container was 9 too wide, and nothing in the suite looked past the pane.
 *
 * Two subtractions were wrong, and both were invisible in source:
 *
 *   − 10  the pane gave its right side 22 instead of 32 and expected
 *         `scrollbar-gutter: stable` to hand the 10 back. The gutter is zero
 *         with OVERLAY scrollbars, which is the macOS default.
 *   −  1  the rule between the columns was a `border-r`, and the kit's own
 *         `Divider` is a node of width 0 — 591 + 639 = 1230, the whole row.
 *
 * The 1 is not a rounding error: four cards plus three gaps come to 527
 * exactly, so a 526 content box drops the grid to three columns and the cards
 * jump to 170.
 *
 * Read from `app.css` rather than restated here, because the card minimum is a
 * custom property and a test that restated it would agree with itself.
 */
const APP_CSS = readFileSync(
  fileURLToPath(new URL('../../../src/styles/app.css', import.meta.url)),
  'utf8'
)

/** `--wizard-concept-card-min` at a given wizard width, straight out of app.css. */
function cardMinFor(wizardWidth: number): number {
  const declarations = [...APP_CSS.matchAll(/--wizard-concept-card-min:\s*([\d.]+)px/g)]
  const thresholds = [...APP_CSS.matchAll(/@media \(min-width:\s*(\d+)px\)/g)].map(m =>
    Number(m[1])
  )
  // The first declaration is the bare `:root`; each later one belongs to the
  // media query that precedes it in the file.
  let value = Number(declarations[0][1])
  declarations.slice(1).forEach((declaration, index) => {
    const at = APP_CSS.indexOf(declaration[0])
    const guard = thresholds.filter(t => APP_CSS.indexOf(`@media (min-width: ${t}px)`) < at).pop()
    if (guard !== undefined && wizardWidth >= guard) value = Number(declaration[1])
    void index
  })
  return value
}

/** What CSS grid does with `repeat(auto-fill, minmax(min, 1fr))` and `gap`. */
function cardSizeIn(content: number, min: number, gap = 8): { columns: number; card: number } {
  const columns = Math.max(1, Math.floor((content + gap) / (min + gap)))
  return { columns, card: (content - gap * (columns - 1)) / columns }
}

describe('the concept cards are her size, and that is the pane minus 64', () => {
  const FRAMES = [
    { name: '1280 `5395:119372`', viewport: 1280, left: 479, columns: 3, card: 133 },
    { name: '1440 `5395:118730`', viewport: 1440, left: 591, columns: 4, card: 125.75 },
    { name: '1920 `5395:119180`', viewport: 1920, left: 879, columns: 5, card: 156.6 },
    { name: '2560 `5395:119533`', viewport: 2560, left: 796, columns: 5, card: 140 },
  ] as const

  it.each(FRAMES)('$name draws $columns cards of $card', ({ viewport, left, columns, card }) => {
    const layout = layoutForViewport(viewport, viewport === 2560 ? 1300 : viewport === 1920 ? 920 : viewport === 1440 ? 768 : 720)
    expect(layout.leftPaneWidth).toBe(left)

    // The pane's own `spacing/32` on both sides, and nothing else taken out of
    // it — no scrollbar gutter, no border for the divider.
    const content = left - 64
    const grid = cardSizeIn(content, cardMinFor(layout.wizardWidth))
    expect(grid.columns).toBe(columns)
    expect(grid.card).toBeCloseTo(card, 2)
  })

  it('loses the grid a whole column if the divider takes its pixel back', () => {
    // This is why the rule is drawn rather than bordered. One pixel, four cards
    // to three, 125.75 to 170.
    const grid = cardSizeIn(591 - 64 - 1, cardMinFor(1230))
    expect(grid.columns).toBe(3)
    expect(grid.card).toBeCloseTo(170, 0)
  })

  it('keeps both panes off the scrollbar-gutter arithmetic', () => {
    expect(LEFT_PANE_SCROLL_GUTTER_CLASS).toBe('px-8')
    expect(PREVIEW_PANEL_SCROLL_CLASS).toContain('px-8')
    expect(leftPanelWidthClass(false)).not.toContain('border-r')
    expect(leftPanelWidthClass(false)).toContain('wizard-pane-divider')
    expect(APP_CSS).toMatch(/\.wizard-pane-divider::after\s*\{[^}]*position:\s*absolute/)
  })
})
