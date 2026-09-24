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
 * Floor of the square inside the capped container — `5395:119983`.
 *
 * Above 1920 the square has a band, not a single size: the kit's own container
 * is `min-height: 860` / `max-height: 960`, and 860 − 120 = 740, 960 − 120 =
 * 840. Both drawn 2560 frames sit on an end of that band — 840 at 1300 tall,
 * 740 at 884 — so there, and only there, the square moves with the height.
 */
export const WIZARD_PREVIEW_MIN_SIDE = 740

/**
 * Ceiling of the square, per breakpoint — the size the designer drew for it.
 * 1280 `5395:119385` → 527, 1440 `5395:118764` → 575, 1920 `5395:119205` → 727,
 * above 1920 `5395:119562` → 840 (which is also `max-height: 960` minus the 120
 * of chrome, so the kit states it twice).
 *
 * Without this the square grows with the window forever and eats the left
 * column; with it, a window taller than the one she drew simply leaves white
 * space under the square, which is what every one of the 29 screens shows.
 */
export const WIZARD_PREVIEW_MAX_SIDE = {
  base: 527,
  at1440: 575,
  at1920: 727,
  capped: 840,
} as const

/** Narrowest right column that still makes sense before the drawer takes over. */
export const WIZARD_RIGHT_PANE_MIN_WIDTH = 320

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

/** Concept grid columns per breakpoint — 3 / 4 / 5, measured on all four frames. */
export const WIZARD_CONCEPT_COLUMNS = { base: 3, at1440: 4, at1920: 5 } as const

/**
 * The ceiling that applies at a given wizard width. Thresholds are the same
 * ones the concept grid uses, and for the same reason: they are the designer's
 * four windows minus the sidebar (1440−210, 1920−250).
 */
export function resolvePreviewMaxSide(wizardWidth: number): number {
  if (!Number.isFinite(wizardWidth)) return WIZARD_PREVIEW_MAX_SIDE.base
  if (wizardWidth >= WIZARD_CAPPED_MIN_WIDTH) return WIZARD_PREVIEW_MAX_SIDE.capped
  if (wizardWidth >= WIZARD_WIDTH_AT_1920) return WIZARD_PREVIEW_MAX_SIDE.at1920
  if (wizardWidth >= WIZARD_WIDTH_AT_1440) return WIZARD_PREVIEW_MAX_SIDE.at1440
  return WIZARD_PREVIEW_MAX_SIDE.base
}

export interface WizardPaneGeometry {
  /** Side of the square preview. */
  previewSide: number
  /** Width the right column must take so the square fits its padding. */
  rightPaneWidth: number
  /**
   * Height the right column must take. Normally the square plus its chrome,
   * so a window taller than the designed one leaves white space under the
   * panel instead of stretching it — which is what every drawn screen shows.
   * Never taller than the row itself: when the square is at its floor and does
   * not fit (`5395:119983`), the panel stays row-height and scrolls inside.
   */
  rightPaneHeight: number
}

/**
 * Right-column geometry for a given row height.
 *
 * `maxSide` is the size drawn for the current breakpoint
 * (`resolvePreviewMaxSide`), and below 1920 it is BOTH the ceiling and the
 * floor: the square does not move with the window at all, and a window too
 * short for it makes the column scroll — the same thing a short window already
 * does to the left column. Growing with the height ate the left column;
 * shrinking with it made the concept tiles grow. Both were defects.
 *
 * `capped` is the ">1920" regime, where the kit gives the square a real band
 * (740…840, i.e. the container's own `min-height` / `max-height` minus the 120
 * of chrome). Below the band it stops and the column scrolls.
 *
 * A non-finite or absurd height (first paint, a detached node) returns zeroes,
 * which the caller reads as "not measured yet" and leaves the column on its CSS
 * default — never as "collapse the column to nothing".
 *
 * `maxSide` is **required**: since it is also the floor below 1920, a call that
 * omits it has no meaning any more. Every caller has to say which breakpoint
 * it is asking about.
 */
export function resolveWizardPaneGeometry(
  paneHeight: number,
  { capped = false, maxSide }: { capped?: boolean; maxSide: number }
): WizardPaneGeometry {
  if (!Number.isFinite(paneHeight) || paneHeight <= WIZARD_PREVIEW_VERTICAL_CHROME) {
    return { previewSide: 0, rightPaneWidth: 0, rightPaneHeight: 0 }
  }

  // The floor matters as much as the ceiling, and leaving it out below 1920 was
  // the second defect of this work: the square was free to shrink with the
  // window, the right column narrowed behind it and the left column swallowed
  // the difference — so a shorter window made the concept tiles BIGGER.
  //
  // A short window must do to the right column exactly what it does to the
  // left one: nothing to its width, and a scrollbar inside it. So below 1920
  // the floor IS the ceiling — the square is simply the size drawn for that
  // breakpoint. Above 1920 the kit gives a real band (`min-height: 860` /
  // `max-height: 960` on `5395:119538` = 740…840), and both drawn 2560 frames
  // sit on its ends, so there the square does move with the height.
  const floor = capped ? WIZARD_PREVIEW_MIN_SIDE : maxSide
  const previewSide = Math.min(
    Math.max(paneHeight - WIZARD_PREVIEW_VERTICAL_CHROME, floor),
    maxSide
  )

  return {
    previewSide,
    rightPaneWidth: Math.max(
      WIZARD_RIGHT_PANE_MIN_WIDTH,
      previewSide + WIZARD_RIGHT_PANE_HORIZONTAL_CHROME
    ),
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
 */
export function fitPhoneBoxRem(
  previewSide: number,
  { designWidthPx, designHeightPx, count = 1, gapPx = 0 }: FitPhoneBoxOptions
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
  const scale = Math.min(
    1,
    forPhones / (designWidthPx * count),
    previewSide / designHeightPx
  )

  return {
    widthRem: (designWidthPx * scale) / 16,
    heightRem: (designHeightPx * scale) / 16,
  }
}
