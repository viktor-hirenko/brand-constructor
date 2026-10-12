import { describe, it, expect } from 'vitest'
import {
  fitPhoneBoxRem,
  WIZARD_CAPPED_MIN_WIDTH,
  WIZARD_PREVIEW_ANCHORS,
  WIZARD_PREVIEW_SIDE_CAPPED,
  WIZARD_FRAME_INSET,
  WIZARD_FRAME_MAX_HEIGHT,
  WIZARD_FRAME_MAX_WIDTH,
  WIZARD_PANE_PADDING,
  WIZARD_PREVIEW_VERTICAL_CHROME,
  WIZARD_RIGHT_PANE_MIN_WIDTH,
  resolveWizardPaneGeometry,
} from '@/constants/wizardResponsive'
import { PREVIEW_PANEL_PHONE_INSET_PX, PREVIEW_PANEL_PHONE_ROW_CLASS } from '@/constants/previewLayout'
import { PREVIEW_CANVAS, PREVIEW_CHASSIS } from '@/constants/visualPreviewLayout'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
  { name: '1280×720  `5395:119360`', paneHeight: 647, wizard: 1070, right: 591, preview: 527, previewSide: 527 },
  { name: '1440×768  `5395:118730`', paneHeight: 695, wizard: 1230, right: 639, preview: 575, previewSide: 575 },
  { name: '1920×920  `5395:119180`', paneHeight: 847, wizard: 1670, right: 791, preview: 727, previewSide: 727 },
  { name: '2560×1300 `5395:119533`', paneHeight: 960, wizard: 1700, right: 904, preview: 840, previewSide: 840, capped: true },
  // Her short 2560 frame draws 804/740; we draw 904/840 and scroll instead.
  // Deliberate divergence, see the block below and divergences row 90.
  { name: '2560×884  `5395:119983`', paneHeight: 715, wizard: 1700, right: 904, preview: 840, previewSide: 840, capped: true },
] as const

describe('the right column is the driver, and it comes from the height', () => {
  it.each(FRAMES)('$name', ({ paneHeight, right, preview, previewSide }) => {
    const geometry = resolveWizardPaneGeometry(paneHeight, { previewSide })
    expect(geometry.previewSide).toBe(preview)
    expect(geometry.rightPaneWidth).toBe(right)
  })

  it('leaves the left column the remainder, which is what the frames show', () => {
    // The kit gives the left column `flex: 1 0 0`; these are the widths that
    // fall out of it, and they are the ones drawn.
    const lefts = FRAMES.map(frame => frame.wizard - frame.right)
    expect(lefts).toEqual([479, 591, 879, 796, 796])
  })

  it('spends the 120 on padding, header and gap — nothing else', () => {
    expect(WIZARD_PREVIEW_VERTICAL_CHROME).toBe(120)
    expect(WIZARD_PANE_PADDING).toBe(32)
    // right = square + the two horizontal paddings.
    expect(resolveWizardPaneGeometry(695, { previewSide: 575 }).rightPaneWidth).toBe(575 + 64)
    // And a row exactly tall enough for the square gets a panel exactly that
    // tall: square + the 120. One pixel less and the panel starts scrolling.
    expect(resolveWizardPaneGeometry(695, { previewSide: 575 }).rightPaneHeight).toBe(695)
    expect(resolveWizardPaneGeometry(694, { previewSide: 575 }).rightPaneHeight).toBe(694)
  })
})

describe('the window height moves nothing — it only decides scroll', () => {
  it('keeps the square at the size drawn for the breakpoint, however short', () => {
    // Her short 2560 frame `5395:119983` draws 804/740, and 740 is
    // `min-height: 860` of the container minus the 120 of chrome. That
    // `min-height` was already rejected (divergences row 86) because her own
    // frame draws the container 715, below her stated minimum. Keeping 740
    // while rejecting 860 is the same number twice, so neither is honoured.
    for (const height of [960, 860, 715, 500]) {
      expect(resolveWizardPaneGeometry(height, { previewSide: 840 }).previewSide).toBe(840)
      expect(resolveWizardPaneGeometry(height, { previewSide: 840 }).rightPaneWidth).toBe(904)
    }
  })

  it('does not shrink the square below 1920 either', () => {
    expect(resolveWizardPaneGeometry(715, { previewSide: 575 }).previewSide).toBe(575)
    expect(resolveWizardPaneGeometry(400, { previewSide: 575 }).previewSide).toBe(575)
  })

  it('lets the PANEL shrink to the row, so the overflow scrolls', () => {
    // The panel never claims more height than the row it sits in…
    expect(resolveWizardPaneGeometry(400, { previewSide: 575 }).rightPaneHeight).toBe(400)
    // …while the square keeps its full side and overflows the scroll area
    // inside the panel. That difference is the scrollbar the kit draws in BOTH
    // columns of the short frame, and the reason the square stops squashing
    // into a rectangle. The square is stated on the box itself now
    // (`--wizard-preview-side`, `constants/previewLayout.ts`), which is what
    // lets the header above the scroll area stay put — divergences row 94.
    expect(resolveWizardPaneGeometry(400, { previewSide: 575 }).previewSide).toBe(575)
    // The scroll area is the panel minus the 120 of chrome: 280 of a 575
    // square visible, 295 reachable by scrolling.
    const geometry = resolveWizardPaneGeometry(400, { previewSide: 575 })
    expect(geometry.rightPaneHeight - WIZARD_PREVIEW_VERTICAL_CHROME).toBe(280)
  })
})

describe('bad input never collapses a column', () => {
  it.each([0, -50, Number.NaN])('returns 0 for %s so the caller keeps the CSS default', height => {
    expect(resolveWizardPaneGeometry(height, { previewSide: 575 }).rightPaneWidth).toBe(0)
  })

  it('returns 0 when the breakpoint size is missing, rather than guessing one', () => {
    expect(
      resolveWizardPaneGeometry(695, { previewSide: Number.POSITIVE_INFINITY }).rightPaneWidth
    ).toBe(0)
  })

  it('never returns a column narrower than the floor once it returns one', () => {
    expect(resolveWizardPaneGeometry(130, { previewSide: 1 }).rightPaneWidth).toBe(
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

  it('anchors the square on the four widths she drew', () => {
    expect(WIZARD_PREVIEW_ANCHORS.map(a => [a.wizardWidth, a.side])).toEqual([
      [1070, 527],
      [1230, 575],
      [1670, 727],
    ])
    expect(WIZARD_PREVIEW_SIDE_CAPPED).toBe(840)
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

/**
 * DP-15450, CEO view 4 · HIGH — «Preview справа некоректно масштабується:
 * порушуються пропорції, частина контенту не вміщується. → Зберігати фіксовані
 * пропорції preview без crop: підлаштовувати його по висоті viewport, а ширину
 * рахувати пропорційно.»
 *
 * Checked live on 12.10: at 1280×720 the square is 527 and the phones on Final
 * review and on the CEO's screen ran 31 px under its bottom edge (5 px at
 * 1366×768); the right column scrolled. The fit above measured the bare phone,
 * 520, against the bare square, 527 — and «fits». It left out what the phone
 * actually occupies: the kit's 24 above it (`PREVIEW_PANEL_PHONE_ROW_CLASS`,
 * `pt-6`) and the bezel, which hangs out of the phone box on every side.
 *
 * So the hosts now tell the fit about the inset: 24 above — the kit's number —
 * and never less than 24 below. On the square she drew, 575, that changes
 * nothing: 24 + 520 + 24 = 568.
 */
describe('CEO view 4: the phone, its inset and its bezel all stay inside the square', () => {
  const INSET = { insetTopPx: PREVIEW_PANEL_PHONE_INSET_PX, insetBottomPx: PREVIEW_PANEL_PHONE_INSET_PX }
  const ONE = { designWidthPx: 239.1761932373047, designHeightPx: 520, ...INSET }
  const PAIR = { ...ONE, count: 2, gapPx: 32 }
  // How far the bezel reaches below the phone box, per px of the box's height.
  const BEZEL_BELOW = (PREVIEW_CHASSIS.topPx + PREVIEW_CHASSIS.heightPx - PREVIEW_CANVAS.heightPx) / PREVIEW_CANVAS.heightPx

  it('the inset in the arithmetic is the inset in the class', () => {
    expect(PREVIEW_PANEL_PHONE_INSET_PX).toBe(24)
    expect(PREVIEW_PANEL_PHONE_ROW_CLASS.split(' ')).toContain('pt-6')
  })

  it('leaves the drawn size alone on the square she drew and above it', () => {
    for (const side of [575, 608, 727, 840]) {
      expect(fitPhoneBoxRem(side, ONE).heightRem * 16).toBe(520)
      expect(fitPhoneBoxRem(side, PAIR).widthRem * 16).toBeCloseTo(239.176, 2)
    }
  })

  it('shrinks the phone on the squares where it used to run under the edge', () => {
    // 1280×720 → 527: it stood 520 tall from y=24, bezel down to 557.7.
    expect(fitPhoneBoxRem(527, PAIR).heightRem * 16).toBeCloseTo(479, 4)
    expect(fitPhoneBoxRem(527, ONE).heightRem * 16).toBeCloseTo(479, 4)
    // 1366×768 → 553.
    expect(fitPhoneBoxRem(553, PAIR).heightRem * 16).toBeCloseTo(505, 4)
  })

  it('nothing of the phone is below the square, bezel included', () => {
    for (const side of [400, 450, 500, 527, 553, 575, 727]) {
      for (const opts of [ONE, PAIR]) {
        const box = fitPhoneBoxRem(side, opts)
        const height = box.heightRem * 16
        expect(PREVIEW_PANEL_PHONE_INSET_PX + height * (1 + BEZEL_BELOW)).toBeLessThanOrEqual(side)
        expect(box.widthRem / box.heightRem).toBeCloseTo(ONE.designWidthPx / ONE.designHeightPx, 10)
      }
    }
  })

  it('the pair still fits across', () => {
    for (const side of [400, 527, 553]) {
      expect(fitPhoneBoxRem(side, PAIR).widthRem * 16 * 2 + 32).toBeLessThanOrEqual(side)
    }
  })

  it('without an inset the fit is what it was', () => {
    expect(fitPhoneBoxRem(527, { designWidthPx: 239.1761932373047, designHeightPx: 520 }).heightRem * 16).toBe(520)
  })

  it('every screen that stands a phone in the square passes the inset', () => {
    const src = (rel: string) => readFileSync(resolve(__dirname, '../../../src', rel), 'utf8')
    const step7 = src('components/constructor/layout/StepPreviewRightPanel.vue')
    const review = src('components/constructor/preview/BrandPreviewPanel.vue')

    for (const file of [step7, review]) {
      expect(file).toMatch(/insetTopPx: PREVIEW_PANEL_PHONE_INSET_PX/)
      expect(file).toMatch(/insetBottomPx: PREVIEW_PANEL_PHONE_INSET_PX/)
    }
    // The review's lone phone («Довірити вибір дизайнерам») used to take the
    // default box and so was never fitted at all.
    expect(review).not.toMatch(/<PhonePreviewCanvas>/)
  })
})
