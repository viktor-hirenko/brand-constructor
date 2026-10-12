import { describe, it, expect } from 'vitest'
import {
  fitPhoneBoxRem,
  fitPhonesToPanel,
  PREVIEW_PANEL_STACK_MAX_WIDTH,
  WIZARD_CAPPED_MIN_WIDTH,
  WIZARD_PREVIEW_ANCHORS,
  WIZARD_PREVIEW_SIDE_CAPPED,
  WIZARD_FRAME_INSET,
  WIZARD_FRAME_MAX_HEIGHT,
  WIZARD_FRAME_MAX_WIDTH,
  WIZARD_PANE_PADDING,
  WIZARD_PREVIEW_MIN_SIDE,
  WIZARD_PREVIEW_VERTICAL_CHROME,
  WIZARD_RIGHT_PANE_MIN_WIDTH,
  resolvePreviewFloor,
  resolveWizardPaneGeometry,
} from '@/constants/wizardResponsive'
import { PREVIEW_PANEL_PHONE_INSET_PX, PREVIEW_PANEL_PHONE_ROW_CLASS } from '@/constants/previewLayout'
import { PREVIEW_CANVAS, PREVIEW_CHASSIS, PREVIEW_PANEL_PHONE_LIMITS } from '@/constants/visualPreviewLayout'
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

/** The floor of the preview below 1920 — `WIZARD_PREVIEW_MIN_SIDE`, spelled once for the calls below. */
const FLOOR = 400

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
  it.each(FRAMES)('$name', ({ paneHeight, right, preview, previewSide, wizard }) => {
    const geometry = resolveWizardPaneGeometry(paneHeight, { previewSide, minSide: resolvePreviewFloor(wizard) })
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
    expect(resolveWizardPaneGeometry(695, { previewSide: 575, minSide: FLOOR }).rightPaneWidth).toBe(575 + 64)
    // And a row exactly tall enough for the square gets a panel exactly that
    // tall: square + the 120. One pixel less and the preview gives that pixel
    // up — the panel is still the row, and nothing scrolls.
    expect(resolveWizardPaneGeometry(695, { previewSide: 575, minSide: FLOOR }).rightPaneHeight).toBe(695)
    expect(resolveWizardPaneGeometry(694, { previewSide: 575, minSide: FLOOR }).rightPaneHeight).toBe(694)
    expect(resolveWizardPaneGeometry(694, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(574)
  })
})

/**
 * ── 12.10.2026: the height moves the PREVIEW, and still never the columns ────
 *
 * Until now a short window did nothing to the square: it kept the size drawn
 * for the breakpoint and the panel scrolled. The owner opened production on a
 * landscape tablet (1024×768) and a landscape phone (956×440) and saw the
 * phones of the preview cut off at the bottom: «Либо это скролл, либо это
 * уменьшение… Нужно сделать это как-то разумно».
 *
 * The rule of 24.09 stays where it was earned: the COLUMNS come from the width
 * alone — shrinking the right column with the height made the concept tiles
 * grow as the window got smaller. What changes is only what is drawn inside the
 * column: the preview takes the height the row can give, down to a floor, and
 * below the floor the panel scrolls — the sticker's own bullet, «Якщо висоти
 * viewport недостатньо для відображення preview у мінімально допустимому
 * розмірі, права колонка стає вертикально scrollable».
 *
 * Above 1920 nothing changes: there the floor IS the drawn 840, which is what
 * her short frame `5395:119983` shows — a preview the window is too short for,
 * and a scrollbar.
 */
describe('a short window shrinks the preview, never the column', () => {
  it('names the floor once: 400 below 1920, the drawn 840 above it', () => {
    expect(WIZARD_PREVIEW_MIN_SIDE).toBe(400)
    expect(resolvePreviewFloor(1070)).toBe(400)
    expect(resolvePreviewFloor(1670)).toBe(400)
    expect(resolvePreviewFloor(1671)).toBe(840)
    expect(resolvePreviewFloor(2310)).toBe(840)
  })

  it('above 1920 keeps the preview at the drawn size, however short', () => {
    for (const height of [960, 860, 715, 500]) {
      const geometry = resolveWizardPaneGeometry(height, { previewSide: 840, minSide: resolvePreviewFloor(1700) })
      expect(geometry.previewSide).toBe(840)
      expect(geometry.rightPaneWidth).toBe(904)
    }
  })

  it('below 1920 gives the preview what the row has left after the 120 of chrome', () => {
    // Tall enough: the drawn size, as before.
    expect(resolveWizardPaneGeometry(715, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(575)
    // Shorter: the row minus the chrome — whole on screen, nothing to scroll.
    expect(resolveWizardPaneGeometry(600, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(480)
    expect(resolveWizardPaneGeometry(600, { previewSide: 575, minSide: FLOOR }).rightPaneHeight).toBe(600)
    // Down to the floor, and not a pixel under it.
    expect(resolveWizardPaneGeometry(520, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(400)
  })

  it('a row too short even for the floor does NOT shrink the preview — it scrolls at full size', () => {
    // The first cut held the preview at the floor from here down, and it
    // scrolled all the same. The owner, on a landscape phone (956×440), the
    // phones 162 × 352 in a 591 column: «Почему они такие маленькие?… Смысл их
    // нам делать такими мелкими?» Shrinking is worth it only where it removes
    // the scroll; where it cannot, the preview keeps the size drawn for the
    // width.
    expect(resolveWizardPaneGeometry(519, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(575)
    expect(resolveWizardPaneGeometry(400, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(575)
    expect(resolveWizardPaneGeometry(120, { previewSide: 575, minSide: FLOOR }).previewSide).toBe(575)
    // The panel is still the row, so what does not fit scrolls.
    expect(resolveWizardPaneGeometry(400, { previewSide: 575, minSide: FLOOR }).rightPaneHeight).toBe(400)
  })

  it('never moves the column: its width is the square of the breakpoint plus 64, at any height', () => {
    for (const height of [1200, 695, 600, 400, 200]) {
      const geometry = resolveWizardPaneGeometry(height, { previewSide: 575, minSide: FLOOR })
      expect(geometry.rightPaneWidth).toBe(639)
      expect(geometry.columnSide).toBe(575)
    }
  })

  it('lets the PANEL shrink to the row, so what is left over scrolls', () => {
    // The panel never claims more height than the row it sits in…
    const geometry = resolveWizardPaneGeometry(400, { previewSide: 575, minSide: FLOOR })
    expect(geometry.rightPaneHeight).toBe(400)
    // …and the scroll area is the panel minus the 120 of chrome: 280 of the
    // 575 preview visible, the rest reachable by scrolling.
    expect(geometry.rightPaneHeight - WIZARD_PREVIEW_VERTICAL_CHROME).toBe(280)
    expect(geometry.previewSide).toBe(575)
  })

  it('a floor above the drawn size means «do not shrink», not «grow»', () => {
    expect(resolveWizardPaneGeometry(300, { previewSide: 527, minSide: 9999 }).previewSide).toBe(527)
  })

  it('the three windows the owner showed', () => {
    // Landscape tablet 1024×768: below 1280 the Admin keeps its 79 header, the
    // wizard area is 1024×689 and the row under the wizard header 616.
    const tablet = resolveWizardPaneGeometry(616, { previewSide: 527, minSide: FLOOR })
    expect(tablet.previewSide).toBe(496)
    expect(tablet.rightPaneWidth).toBe(591)
    expect(tablet.rightPaneHeight).toBe(616)
    // The pair of phones inside it, with the kit's 24 above and below.
    const phones = fitPhoneBoxRem(tablet.previewSide, {
      designWidthPx: 239.1761932373047,
      designHeightPx: 520,
      count: 2,
      gapPx: 32,
      insetTopPx: 24,
      insetBottomPx: 24,
    })
    expect(phones.heightRem * 16).toBeCloseTo(448, 4)

    // Laptop 1280×640: row 567.
    expect(resolveWizardPaneGeometry(567, { previewSide: 527, minSide: FLOOR }).previewSide).toBe(447)

    // Landscape phone 956×440: wizard area 956×361, row 288 — no room even for
    // the floor, so the preview is not shrunk at all and the panel scrolls.
    const phone = resolveWizardPaneGeometry(288, { previewSide: 527, minSide: FLOOR })
    expect(phone.previewSide).toBe(527)
    expect(phone.rightPaneWidth).toBe(591)
    expect(phone.rightPaneHeight).toBe(288)
    const big = fitPhoneBoxRem(phone.previewSide, {
      designWidthPx: 239.1761932373047,
      designHeightPx: 520,
      count: 2,
      gapPx: 32,
      insetTopPx: 24,
      insetBottomPx: 24,
    })
    expect(big.heightRem * 16).toBeCloseTo(479, 4)
  })
})

/**
 * ── The preview as a full-screen PANEL (a wizard 900 wide or narrower) ───────
 *
 * On a portrait phone or tablet the right column is not a column: the preview
 * opens over the whole wizard. The phones in it were sized for the 527 square
 * of a laptop column that is not there — 220 × 479 on an iPad mini (768×1024)
 * with half the screen empty, and the same on an iPhone 16 Pro Max (440×956).
 *
 * The owner, 12.10: «Если есть место сделать их чуть-чуть больше для
 * отображения, можно… может, тут стоит рассмотреть какие-то контейнерные
 * единицы… вертикальный телефон, он может быть разной ширины». And on the
 * sketch: «Да, правильно. Только на планшете смотри, чтобы не было
 * горизонтального скролла… если планшет позволяет, чтобы поместилось на экран,
 * пусть помещается».
 *
 * So in the panel the phones are sized from the PANEL — its own width and the
 * height it shows — which is the container, whatever device it is on:
 *   a pair that fits side by side takes the largest size at which BOTH are
 *   whole on the screen, bezels included, with nothing to scroll either way;
 *   under 560 the pair stands in a column (`app.css`) and ONE phone is whole
 *   on the screen;
 *   never wider than the canvas the slices are drawn on (360 × 782.69);
 *   a panel too short to hold a phone at the floor does not shrink it — the
 *   drawn 520, scrolling down, as in the column.
 * The gap between the phones scales with them: at the drawn size the bezels
 * stand 3 px apart, at 1.3× with a fixed 32 they would overlap.
 */
describe('in the full-screen panel the phones are sized from the panel itself', () => {
  const PHONE = { designWidthPx: 239.1761932373047, designHeightPx: 520, insetTopPx: 24, insetBottomPx: 24, ...PREVIEW_PANEL_PHONE_LIMITS }
  const PAIR = { ...PHONE, count: 2, gapPx: 32 }
  const RATIO = PHONE.designWidthPx / PHONE.designHeightPx
  /** What the hosts hand over: the scroll area's client box minus its 32 paddings. */
  const room = (clientWidth: number, clientHeight: number) => ({ width: clientWidth - 64, height: clientHeight - 32 })
  /** Width a row of phones really takes: the boxes, the gaps, and the bezel hanging out of the two outer edges. */
  const rowWidth = (fit: { widthRem: number; gapPx: number }, perRow: number) =>
    fit.widthRem * 16 * (perRow + 2 * PREVIEW_PANEL_PHONE_LIMITS.bezelSideShare) + fit.gapPx * (perRow - 1)

  it('takes its limits from the phone canvas, not from thin air', () => {
    expect(PREVIEW_PANEL_PHONE_LIMITS.maxHeightPx).toBe(PREVIEW_CANVAS.heightPx)
    expect(PREVIEW_PANEL_PHONE_LIMITS.bezelSideShare).toBeCloseTo(-PREVIEW_CHASSIS.leftPx / PREVIEW_CANVAS.widthPx, 10)
  })

  it('iPad mini, portrait (panel 768 × 784): both phones side by side, whole, nothing to scroll', () => {
    const fit = fitPhonesToPanel(room(768, 784), { ...PAIR, panelWidthPx: 768 })
    const height = fit.heightRem * 16

    expect(fit.stacked).toBe(false)
    // Far larger than the 479 of the laptop column…
    expect(height).toBeGreaterThan(650)
    // …and inside the panel on both axes: no horizontal scroll, no vertical one.
    expect(rowWidth(fit, 2)).toBeLessThanOrEqual(768 - 64 + 0.01)
    expect(24 + height + 24).toBeLessThanOrEqual(784 - 32)
    expect(fit.widthRem / fit.heightRem).toBeCloseTo(RATIO, 10)
  })

  it('no tablet width between 561 and 900 gives the row more than the panel is wide', () => {
    for (const width of [561, 600, 700, 768, 820, 834, 900]) {
      for (const height of [500, 700, 784, 1000, 1200]) {
        const fit = fitPhonesToPanel(room(width, height), { ...PAIR, panelWidthPx: width })
        expect(fit.stacked).toBe(false)
        expect(rowWidth(fit, 2)).toBeLessThanOrEqual(width - 64 + 0.01)
      }
    }
  })

  it('iPhone 16 Pro Max, portrait (panel 440 × 737): a column, one phone whole on the screen', () => {
    const fit = fitPhonesToPanel(room(440, 737), { ...PAIR, panelWidthPx: 440 })
    const height = fit.heightRem * 16

    expect(fit.stacked).toBe(true)
    expect(height).toBeCloseTo(737 - 32 - 48, 4)
    expect(rowWidth(fit, 1)).toBeLessThanOrEqual(440 - 64 + 0.01)
  })

  it('a narrower phone gets a narrower one — the width binds, whatever the model', () => {
    for (const width of [320, 360, 375, 390, 414, 440, 560]) {
      const fit = fitPhonesToPanel(room(width, 900), { ...PAIR, panelWidthPx: width })
      expect(fit.stacked).toBe(true)
      expect(rowWidth(fit, 1)).toBeLessThanOrEqual(width - 64 + 0.01)
      expect(fit.widthRem / fit.heightRem).toBeCloseTo(RATIO, 10)
    }
    const small = fitPhonesToPanel(room(320, 900), { ...PAIR, panelWidthPx: 320 })
    const large = fitPhonesToPanel(room(440, 900), { ...PAIR, panelWidthPx: 440 })
    expect(small.widthRem).toBeLessThan(large.widthRem)
  })

  it('the lone phone of step 7 fills the panel the same way', () => {
    const tablet = fitPhonesToPanel(room(768, 784), { ...PHONE, panelWidthPx: 768 })
    expect(tablet.stacked).toBe(false)
    expect(tablet.heightRem * 16).toBeCloseTo(784 - 32 - 48, 4)

    const phone = fitPhonesToPanel(room(440, 737), { ...PHONE, panelWidthPx: 440 })
    expect(phone.heightRem * 16).toBeCloseTo(737 - 32 - 48, 4)
  })

  it('never draws the phone larger than the canvas its slices are drawn on', () => {
    const fit = fitPhonesToPanel(room(900, 2000), { ...PHONE, panelWidthPx: 900 })
    expect(fit.heightRem * 16).toBeCloseTo(PREVIEW_CANVAS.heightPx, 4)
  })

  it('a panel too short for the floor keeps the drawn 520 and scrolls down — never sideways', () => {
    // A phone on its side, 844 × 390: the wizard is 844 wide, the panel shows
    // some 150 of height.
    const fit = fitPhonesToPanel(room(844, 150), { ...PAIR, panelWidthPx: 844 })
    expect(fit.stacked).toBe(false)
    expect(fit.heightRem * 16).toBe(520)
    expect(rowWidth(fit, 2)).toBeLessThanOrEqual(844 - 64 + 0.01)

    // And where even the drawn pair is too wide for it, the width still wins.
    const narrow = fitPhonesToPanel(room(561, 150), { ...PAIR, panelWidthPx: 561 })
    expect(rowWidth(narrow, 2)).toBeLessThanOrEqual(561 - 64 + 0.01)
    expect(narrow.heightRem * 16).toBeLessThan(520)
  })

  it('scales the gap with the phones, so the bezels never touch', () => {
    const fit = fitPhonesToPanel(room(768, 784), { ...PAIR, panelWidthPx: 768 })
    const scale = (fit.heightRem * 16) / 520
    expect(fit.gapPx).toBeCloseTo(32 * scale, 6)
    // Bezel of the left phone + bezel of the right one, against the gap between the boxes.
    expect(2 * fit.widthRem * 16 * PREVIEW_PANEL_PHONE_LIMITS.bezelSideShare).toBeLessThan(fit.gapPx)
  })

  it('before the panel is measured it is the drawn size, not a collapsed phone', () => {
    for (const box of [{ width: 0, height: 0 }, { width: -64, height: -32 }, { width: Number.NaN, height: 100 }]) {
      const fit = fitPhonesToPanel(box, { ...PAIR, panelWidthPx: 0 })
      expect(fit.heightRem * 16).toBe(520)
      expect(fit.gapPx).toBe(32)
    }
  })

  it('the column starts where the stylesheet says it does', () => {
    const css = readFileSync(resolve(__dirname, '../../../src/styles/app.css'), 'utf8')
    expect(css).toMatch(
      new RegExp(`@media \\(max-width: ${PREVIEW_PANEL_STACK_MAX_WIDTH}px\\)\\s*\\{\\s*html\\.wizard-embed \\.brand-preview-panel__dual-phones`)
    )
  })

  it('both screens that stand a phone in the panel size it from the panel', () => {
    const src = (rel: string) => readFileSync(resolve(__dirname, '../../../src', rel), 'utf8')
    for (const file of [
      src('components/constructor/layout/StepPreviewRightPanel.vue'),
      src('components/constructor/preview/BrandPreviewPanel.vue'),
    ]) {
      expect(file).toContain('usePreviewPanelBox()')
      expect(file).toContain('fitPhonesToPanel(')
      expect(file).toMatch(/isNarrowEmbed\.value/)
    }
  })
})

describe('bad input never collapses a column', () => {
  it.each([0, -50, Number.NaN])('returns 0 for %s so the caller keeps the CSS default', height => {
    expect(resolveWizardPaneGeometry(height, { previewSide: 575, minSide: FLOOR }).rightPaneWidth).toBe(0)
  })

  it('returns 0 when the breakpoint size is missing, rather than guessing one', () => {
    expect(
      resolveWizardPaneGeometry(695, { previewSide: Number.POSITIVE_INFINITY, minSide: FLOOR }).rightPaneWidth
    ).toBe(0)
  })

  it('never returns a column narrower than the floor once it returns one', () => {
    expect(resolveWizardPaneGeometry(130, { previewSide: 1, minSide: FLOOR }).rightPaneWidth).toBe(
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
