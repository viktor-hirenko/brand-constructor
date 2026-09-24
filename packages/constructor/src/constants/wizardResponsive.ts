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
 * ── The formula, derived from the nodes and checked on all five frames ───────
 * The **right** column is the driver, not the left, and its width comes from
 * the available height:
 *
 *   preview side  = pane height − 120      (32 + 32 padding, 32 header, 24 gap)
 *   right column  = preview side + 64      (the two 32 paddings)  = height − 56
 *   left column   = whatever is left       (`flex: 1 0 0`)
 *
 *   1280×720   pane 647 → 527 · 591, left 479   (`5395:119360`)
 *   1440×768   pane 695 → 575 · 639, left 591   (`5395:118730`)
 *   1920×920   pane 847 → 727 · 791, left 879   (`5395:119180`)
 *   2560×1300  pane 960 → 840 · 904, left 796   (`5395:119533`)
 *   2560×884   pane 715 → 740 · 804, left 896   (`5395:119983`)
 *
 * The last row is the one that proves the floor: 715 − 120 = 595, but the
 * designer kept the square at 740 and let the right column scroll — which is
 * bullet four of her sticker `5395:118367`. The floor only applies inside the
 * capped container, because below 1920 she shrinks the square all the way down
 * to 527 without complaint.
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

/** Floor of the square inside the capped container — `5395:119983`. */
export const WIZARD_PREVIEW_MIN_SIDE = 740

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

export interface WizardPaneGeometry {
  /** Side of the square preview. */
  previewSide: number
  /** Width the right column must take so the square fits its padding. */
  rightPaneWidth: number
}

/**
 * Right-column geometry for a given pane height.
 *
 * `capped` is the ">1920" regime: there and only there the square stops
 * shrinking at 740 and the column scrolls instead.
 *
 * A non-finite or absurd height (first paint, a detached node) returns 0, which
 * the caller reads as "no width yet" and leaves the column on its CSS default —
 * never as "collapse the column to nothing".
 */
export function resolveWizardPaneGeometry(
  paneHeight: number,
  { capped = false }: { capped?: boolean } = {}
): WizardPaneGeometry {
  if (!Number.isFinite(paneHeight) || paneHeight <= WIZARD_PREVIEW_VERTICAL_CHROME) {
    return { previewSide: 0, rightPaneWidth: 0 }
  }

  const fitted = paneHeight - WIZARD_PREVIEW_VERTICAL_CHROME
  const previewSide = capped ? Math.max(fitted, WIZARD_PREVIEW_MIN_SIDE) : fitted

  return {
    previewSide,
    rightPaneWidth: Math.max(
      WIZARD_RIGHT_PANE_MIN_WIDTH,
      previewSide + WIZARD_RIGHT_PANE_HORIZONTAL_CHROME
    ),
  }
}
