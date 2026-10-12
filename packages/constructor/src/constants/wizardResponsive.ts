/**
 * Responsive geometry of the wizard — Figma `Responsive behavior` `5395:118197`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5395-118197&m=dev
 *
 * ── What changed, and why it is a different mechanism, not different numbers ──
 * Until this work the whole wizard was scaled by one knob: a root font-size on
 * `html.wizard-embed` driven by the panel's own `vw`/`vh`. Everything followed
 * it — type, padding, radius, control heights.
 *
 * The kit does the opposite. Across all four drawn breakpoints these are
 * **fixed**: the wizard header 73, the footer buttons 128×48, the segmented
 * control 219×40, the order button 222×40, the comment field 128, every pane
 * padding 32, the preview-panel header 32, the gap under it 24, the preview
 * radius 24. Only two things move: the two columns, and the square preview.
 *
 * So the knob is off (`app.css`: `html.wizard-embed { font-size: 16px }`) and
 * the columns are computed here instead.
 *
 * ── The rule, and the ceiling that was missing from it ──────────────────────
 * The **right** column is the driver, not the left. Its width is the square
 * plus the two 32 paddings, and the square is:
 *
 *   square       = min(pane height − 120, the size drawn for this breakpoint)
 *   right column = square + 64
 *   left column  = whatever is left       (`flex: 1 0 0`)
 *
 * **The ceiling is the correction of 2026-09-24.** The first version of this
 * file had no ceiling: it read `square = height − 120` straight off the four
 * responsive frames and shipped. In those four frames the width and the height
 * change together (1280×720, 1440×768, 1920×920, 2560×1300), so they cannot
 * tell "the height drives the width" apart from "each breakpoint has its own
 * pair" — and the version without a ceiling produces nonsense in a browser: the
 * taller the window, the wider the preview and the narrower the left column.
 * At 1440×900 the left column fell to 459 against the 591 the kit draws.
 *
 * The 29 screens of `5382:36911` settle it, and they were not consulted the
 * first time. Every one of them is 1440 wide, their content areas are 695, 713,
 * 785, 793 and 2471 tall — and the Preview panel is **639×695 in all of them**:
 *   `5382:48440` (step 4, frame 786)            639×695
 *   `5387:105207` (step 4 in the edit flow, 858) 639×695
 *   `5382:64144` (step 7, frame 866)             639 wide
 *   `5387:91948` (step 8 review, frame 2544)     639×695
 * A panel whose width followed its height would have been 657, 729, 737 and
 * 2415. It is 639 every time, and the panel simply sits at the top of a taller
 * column with white space under it — which is exactly what the ceiling does.
 *
 * Height still matters downward, and only downward: `5395:119983` is the same
 * 2560 window 416 shorter, and there the square shrank to its floor of 740 and
 * the column began to scroll. That is bullet four of the sticker.
 *
 *   1280×720   pane 647 → 527 · 591, left 479   (`5395:119360`)
 *   1440×768   pane 695 → 575 · 639, left 591   (`5395:118730`)
 *   1920×920   pane 847 → 727 · 791, left 879   (`5395:119180`)
 *   2560×1300  pane 960 → 840 · 904, left 796   (`5395:119533`)
 *   2560×884   pane 715 → 740 · 804, left 896   (`5395:119983`)
 *
 * Each of those square sizes IS the ceiling for its breakpoint — 527, 575, 727,
 * 840. They are her numbers, read off her frames; none of them is invented.
 *
 * ── The same split holds off the concept screen ──────────────────────────────
 * Checked, not assumed: the drawn step-8 review `5387:91764` is also 591 · 639
 * at 1440, its preview slot is also a 575 square, and the two phones sit inside
 * that square 32 apart. So this is the wizard's layout, not step 2's.
 *
 * ── Why px, when the tree is rem ─────────────────────────────────────────────
 * With the knob off the root is exactly 16 everywhere, so a rem IS a design
 * pixel and the distinction stops mattering for correctness. These numbers are
 * measurements of the panel, not of a component, so they stay in px — the same
 * reason the `clamp` bounds and the media-query thresholds always did.
 */

/** Kit `spacing/32` — the padding of both panes, on every breakpoint. */
export const WIZARD_PANE_PADDING = 32

/** `Header` of the preview panel — 32, the concept-name row and nothing else. */
export const WIZARD_PREVIEW_HEADER_HEIGHT = 32

/** Kit `spacing/24` between that header and the square. */
export const WIZARD_PREVIEW_GAP = 24

/** 32 + 32 + 32 + 24 — everything above and below the square inside the pane. */
export const WIZARD_PREVIEW_VERTICAL_CHROME =
  WIZARD_PANE_PADDING * 2 + WIZARD_PREVIEW_HEADER_HEIGHT + WIZARD_PREVIEW_GAP

/** What the right column adds to the square: the two horizontal paddings. */
export const WIZARD_RIGHT_PANE_HORIZONTAL_CHROME = WIZARD_PANE_PADDING * 2

/**
 * **There is no floor any more, and that is deliberate.**
 *
 * It used to be 740, read off the short 2560 frame `5395:119983`. But 740 is
 * not an independent number: it is `min-height: 860` of the container
 * `5395:119538` minus the 120 of chrome. And that `min-height` was already
 * rejected (divergences row 86) because the designer's own short frame draws
 * the container 715 — below her stated minimum — and honouring 860 would push
 * the container out of the wizard area and take the sticky footer with it.
 *
 * Keeping 740 while rejecting 860 is incoherent: it is the same number twice.
 * So neither is honoured. Above 1920 the square is simply 840, the size drawn
 * on `5395:119533`, and a window too short for it scrolls — which is what a
 * short window already does to the left column, and what the designer draws in
 * BOTH columns of the short frame.
 *
 * The result is one rule that holds at every breakpoint: one square size per
 * breakpoint, never moved by the window height. Divergence recorded.
 */

/**
 * The square the designer drew, at the four wizard widths she drew it at.
 * `1280 − 210 = 1070`, `1440 − 210 = 1230`, `1920 − 250 = 1670`, and the
 * capped frame above that.
 *
 *   1070 → 527  `5395:119385`
 *   1230 → 575  `5395:118764`
 *   1670 → 727  `5395:119205`
 *   capped → 840 `5395:119562` (= `max-height: 960` minus the 120 of chrome)
 *
 * ── Between them the square is INTERPOLATED, and that is a decision ──────────
 * She drew four windows. A real one is rarely any of them: a 16" MacBook at
 * its default scaling is 1728 wide, which gives the wizard 1518 — 288 more
 * than her 1440 frame. Held as a step function, all 288 land on the left
 * column, which comes out 879 against a 639 right column. Her own 1440 is
 * 591·639, almost even; 879·639 is not a layout she ever drew, and the long
 * text lines it produces are the thing the owner called ugly.
 *
 * So between two of her widths the square runs along the straight line between
 * her two numbers. At her four widths the result IS her number, to the pixel —
 * that is what makes it an interpolation and not an invention. Below the first
 * anchor it holds at 527 rather than extrapolating down, or a narrow panel
 * would end up with a right column wider than the left.
 *
 * Owner's decision, 24.09: "пусть смотрит, нам же не нужно будет ещё 10
 * брейкпоинтов". Divergence recorded — the behaviour between her frames is
 * ours, the numbers at her frames are hers.
 */
export const WIZARD_PREVIEW_ANCHORS = [
  { wizardWidth: 1070, side: 527 },
  { wizardWidth: 1230, side: 575 },
  { wizardWidth: 1670, side: 727 },
] as const

/** Inside the capped frame the square does not interpolate — the frame is fixed. */
export const WIZARD_PREVIEW_SIDE_CAPPED = 840

/** Narrowest right column that still makes sense before the drawer takes over. */
export const WIZARD_RIGHT_PANE_MIN_WIDTH = 320

/**
 * The smallest the preview is drawn below 1920 before the panel starts to
 * scroll instead — see `resolveWizardPaneGeometry`. At 400 the phone inside is
 * 352 tall, still legible. **The number is ours**: the sticker `5395:118367`
 * speaks of «мінімально допустимий розмір» and names one only for the frame
 * above 1920.
 */
export const WIZARD_PREVIEW_MIN_SIDE = 400

/**
 * The kit's own cap on the wizard frame above 1920 (`5395:119538`), plus the
 * inset the frame sits in. `min-height: 860` is declared on the same node but
 * is **not** honoured here: the designer's own short-viewport frame
 * `5395:119983` draws the frame 715 tall, i.e. below its stated minimum, and
 * scrolls the right column instead. Divergences row 84.
 */
export const WIZARD_FRAME_MAX_WIDTH = 1700
export const WIZARD_FRAME_MAX_HEIGHT = 960
export const WIZARD_FRAME_INSET = 48
export const WIZARD_FRAME_RADIUS = 24

/**
 * Viewport thresholds, expressed as the WIZARD's own width — which inside the
 * Admin is the panel, i.e. the browser viewport minus the sidebar.
 *
 *   browser 1440 − sidebar 210 = 1230 → the kit's second breakpoint
 *   browser 1920 − sidebar 250 = 1670 → the kit's third
 *
 * Above the third one the kit switches to the capped frame ("більше 1920 px"),
 * so the capped rule starts one pixel past it.
 */
export const WIZARD_WIDTH_AT_1440 = 1230
export const WIZARD_WIDTH_AT_1920 = 1670
export const WIZARD_CAPPED_MIN_WIDTH = WIZARD_WIDTH_AT_1920 + 1

/**
 * The concept grid no longer counts columns: it is `auto-fill` over
 * `--wizard-concept-card-min` in `app.css`, so a column appears as soon as one
 * fits. The counts she draws (3 / 4 / 5) fall out of her card sizes.
 */

/**
 * The square for a given wizard width: her number at her widths, the straight
 * line between her numbers in between. Rounded, so nothing downstream lands on
 * a half pixel and grows a one-pixel scrollbar.
 */
export function resolvePreviewSide(wizardWidth: number): number {
  const first = WIZARD_PREVIEW_ANCHORS[0]
  const last = WIZARD_PREVIEW_ANCHORS[WIZARD_PREVIEW_ANCHORS.length - 1]

  if (!Number.isFinite(wizardWidth)) return first.side
  if (wizardWidth >= WIZARD_CAPPED_MIN_WIDTH) return WIZARD_PREVIEW_SIDE_CAPPED
  // Below her narrowest frame the square holds instead of extrapolating down:
  // otherwise a narrow panel ends up with a right column wider than the left.
  if (wizardWidth <= first.wizardWidth) return first.side
  if (wizardWidth >= last.wizardWidth) return last.side

  for (let i = 1; i < WIZARD_PREVIEW_ANCHORS.length; i += 1) {
    const from = WIZARD_PREVIEW_ANCHORS[i - 1]
    const to = WIZARD_PREVIEW_ANCHORS[i]
    if (wizardWidth <= to.wizardWidth) {
      const share = (wizardWidth - from.wizardWidth) / (to.wizardWidth - from.wizardWidth)
      return Math.round(from.side + share * (to.side - from.side))
    }
  }

  return last.side
}

/**
 * How far the preview may shrink at this wizard width. Below 1920 it is
 * `WIZARD_PREVIEW_MIN_SIDE`; in the capped frame above it the floor IS the
 * drawn size, i.e. the preview never shrinks there and a short window scrolls —
 * what her short frame `5395:119983` draws, and a regime the owner has not
 * asked to change.
 */
export function resolvePreviewFloor(wizardWidth: number): number {
  return wizardWidth >= WIZARD_CAPPED_MIN_WIDTH ? WIZARD_PREVIEW_SIDE_CAPPED : WIZARD_PREVIEW_MIN_SIDE
}

export interface WizardPaneGeometry {
  /**
   * The square drawn for the breakpoint — decided by the WIDTH alone. It sizes
   * the right column and nothing the window height does can move it.
   */
  columnSide: number
  /**
   * Side of the preview actually drawn inside that column: `columnSide` when
   * the row is tall enough, less on a short window (down to the floor). This is
   * what `--wizard-preview-side` and the phones are given.
   */
  previewSide: number
  /** Width the right column must take so the square fits its padding. */
  rightPaneWidth: number
  /**
   * Height the right column takes. The square plus its chrome, so a window
   * taller than the designed one leaves white space under the panel instead of
   * stretching it — which is what every drawn screen shows. Never taller than
   * the row: a window too short makes the panel row-height and scroll inside.
   */
  rightPaneHeight: number
}

/**
 * Right-column geometry for a given row height.
 *
 * `side` comes from `resolvePreviewSide` and decides the COLUMN: its width is
 * that number plus the two paddings, from the WIDTH alone. Growing it with the
 * height ate the left column; shrinking it with the height made the concept
 * tiles grow as the window got smaller. Both were defects (24.09).
 *
 * **What the height does decide, since 12.10.2026, is how tall the preview is
 * drawn inside that column.** The square used to keep its full side whatever
 * the window, and a short one scrolled it. On production that cut the phones
 * of the preview off on a landscape tablet (1024×768: a 527 square in 496 of
 * room) and left a landscape phone (956×440) with 168 of it. The owner: «Либо
 * это скролл, либо это уменьшение… Нужно сделать это как-то разумно». So:
 *
 *   preview = clamp(row − 120, floor, side)
 *
 * — whole on screen while the row can hold it at `floor` or more, and from
 * there down the floor, with the panel scrolling. That last part is the
 * sticker's own bullet: «Якщо висоти viewport недостатньо для відображення
 * preview у мінімально допустимому розмірі, права колонка стає вертикально
 * scrollable». The box stays a square of that side, centred in the column
 * (`.wizard-preview-square` in `app.css`) — «Preview завжди зберігає пропорції»
 * — and the phones take the same number through `fitPhoneBoxRem`.
 *
 * `minSide` is the floor, from `resolvePreviewFloor`. A floor at or above
 * `side` means «never shrink» — the capped frame above 1920.
 *
 * A non-finite or absurd height (first paint, a detached node) returns zeroes,
 * which the caller reads as "not measured yet" and leaves the column on its CSS
 * default — never as "collapse the column to nothing".
 *
 * Both `previewSide` and `minSide` are **required**: the height alone cannot
 * size the column, and without a floor the rule has no end.
 */
export function resolveWizardPaneGeometry(
  paneHeight: number,
  { previewSide: side, minSide }: { previewSide: number; minSide: number }
): WizardPaneGeometry {
  if (!Number.isFinite(paneHeight) || paneHeight <= 0 || !Number.isFinite(side)) {
    return { columnSide: 0, previewSide: 0, rightPaneWidth: 0, rightPaneHeight: 0 }
  }

  const floor = Math.min(Number.isFinite(minSide) ? minSide : side, side)
  const previewSide = Math.min(side, Math.max(floor, paneHeight - WIZARD_PREVIEW_VERTICAL_CHROME))

  return {
    columnSide: side,
    previewSide,
    rightPaneWidth: Math.max(WIZARD_RIGHT_PANE_MIN_WIDTH, side + WIZARD_RIGHT_PANE_HORIZONTAL_CHROME),
    // What the panel claims: never more than the row, so a row too short even
    // for the floor scrolls.
    //
    // The preview itself is `previewSide`, stated on the box as a definite
    // height (`--wizard-preview-side`, see `constants/previewLayout.ts`). A
    // panel shorter than `previewSide + 120` leaves the scroll area around the
    // box short of it, and the area scrolls; the header above it is outside
    // that area and stays put (divergences row 94).
    rightPaneHeight: Math.min(previewSide + WIZARD_PREVIEW_VERTICAL_CHROME, paneHeight),
  }
}


export interface PhoneBoxRem {
  widthRem: number
  heightRem: number
}

export interface FitPhoneBoxOptions {
  /** Design size of one phone, in px at root 16. */
  designWidthPx: number
  designHeightPx: number
  /** How many stand side by side inside the square (review draws two). */
  count?: number
  /** Kit gap between them when there is more than one. */
  gapPx?: number
  /**
   * What the square keeps clear above and below the phone box. Like the gap,
   * these are kit spacings and do NOT scale, so they come off the square before
   * the phone is measured against what is left. See `fitPhoneBoxRem`.
   */
  insetTopPx?: number
  insetBottomPx?: number
}

/**
 * Fits the phone preview into the square, keeping its proportions.
 *
 * This is the designer's own rule, not an invented number — bullet five of the
 * sticker `5395:118367`: «Preview завжди зберігає пропорції та не обрізається,
 * щоб не убли обрізані важливі елементи». The square is what the responsive
 * section sizes (`resolveWizardPaneGeometry`); the phone has to live inside it.
 *
 * **Never scales up.** At and above the size the phone was drawn at, this
 * returns the design size unchanged, so nothing moves on the breakpoints where
 * it already fits. Below it, both axes shrink by the same factor.
 *
 * Why it was not needed before: the whole wizard used to shrink with the Admin
 * panel, so the phone happened to come out small enough. With the root fixed
 * at 16 it does not — at 1440 the square is 575 and the step-7 phone is 650,
 * so the column scrolled where the mockup shows the phone whole.
 *
 * `previewSide` of 0 means "not measured yet" and returns the design size, so
 * the first paint is the full-size phone rather than a collapsed one.
 *
 * **The insets — DP-15450, CEO view 4, checked live 12.10.2026.** Measured bare,
 * the 520 phone «fits» the 527 square of a 1280×720 window. It does not: the
 * phone opens 24 down from the square's top (`PREVIEW_PANEL_PHONE_ROW_CLASS`)
 * and its bezel hangs 13.7 below the box, so it ended at 557.7 and the right
 * column scrolled 31 px on Final review, on the CEO's screen and on step 7.
 * A host that stands the phone at an inset passes it here; with 24 above and 24
 * below the box, the bezel (13.7 at full size, less when shrunk) always lands
 * inside the square, and on the drawn 575 nothing moves: 24 + 520 + 24 = 568.
 */
export function fitPhoneBoxRem(
  previewSide: number,
  {
    designWidthPx,
    designHeightPx,
    count = 1,
    gapPx = 0,
    insetTopPx = 0,
    insetBottomPx = 0,
  }: FitPhoneBoxOptions
): PhoneBoxRem {
  const design: PhoneBoxRem = { widthRem: designWidthPx / 16, heightRem: designHeightPx / 16 }
  if (!Number.isFinite(previewSide) || previewSide <= 0) return design

  // The gap is a kit spacing and does NOT scale — this work's whole point is
  // that kit spacings hold still — so it has to come off the square BEFORE the
  // phones are measured against what is left. Dividing by a row width that
  // included the gap and then adding the unscaled gap back overflowed the
  // square by exactly that gap's share; the test caught it at a 300 square.
  const gaps = gapPx * Math.max(0, count - 1)
  const forPhones = Math.max(0, previewSide - gaps)
  const forHeight = Math.max(0, previewSide - insetTopPx - insetBottomPx)
  const scale = Math.min(
    1,
    forPhones / (designWidthPx * count),
    forHeight / designHeightPx
  )

  return {
    widthRem: (designWidthPx * scale) / 16,
    heightRem: (designHeightPx * scale) / 16,
  }
}
