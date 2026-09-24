/**
 * Structural contract of the phone preview (UXUI-2554, phase 1).
 *
 * Layout is code, slice content is data. Every slice in the design library is
 * exactly 360 design px wide — the full screen width — so a slice renders as
 * `width: 100%; height: auto` and the browser derives its height from the file
 * itself. That is why there is no per-type coordinate table here: a type only
 * declares where it sits in the screen structure.
 */

/** Design-pixel geometry of the phone canvas. */
export const PREVIEW_CANVAS = {
  widthPx: 360,
  heightPx: 782.69,
  /** Chassis strip above the content area — clock and status indicators. */
  statusBarPx: 62,
  /** Chassis strip below the content area — home indicator. */
  homeIndicatorPx: 34,
  /** Area between the two chassis strips: fixed header, scroll body, fixed tabbar. */
  contentHeightPx: 686.69,
} as const

/**
 * Device chassis: Figma node 5194:60453 exported whole at @2x — bezel, status
 * bar and home indicator already composited the way the designer aligned them.
 *
 * One image rather than a bezel layered over the content. The bezel exports
 * opaque (it is the device with a blank screen, not a ring), and its screen
 * aperture is ~8.5 px *wider* than the canvas on every side, so the metal never
 * overlaps a slice anyway — the dark band between a slice edge and the frame is
 * the aperture showing through. Splitting the chassis in two only reintroduced
 * the corners problem: near the canvas's top edge the aperture is narrower than
 * the canvas, so a full-width screen layer painted dark squares over the frame.
 *
 * The chassis overflows the canvas — side buttons stick out — hence the negative
 * offsets, and hence the canvas must not clip its overflow. Content is
 * unaffected: it starts at y=62, well inside the aperture.
 *
 * The `.webp` is the Figma export with the backdrop cut away: the Bezel
 * component carries a #2B2B2B rectangle behind the device, so *every* export of
 * it is opaque and the phone arrived sitting on a dark plate. The cut is exact
 * rather than eyeballed — the transparent source image inside the component
 * gives the device silhouette, and everything outside it is dropped. Re-exporting
 * from Figma will bring the plate back; see the task document for the procedure.
 *
 * Public assets must respect the app `base` (`/wizard/` unified, `/` standalone).
 */
export const PREVIEW_CHASSIS = {
  src: `${import.meta.env.BASE_URL}assets/phone-chassis.webp`,
  leftPx: -21.492538452148438,
  topPx: -20.597015380859375,
  widthPx: 402.9850769042969,
  heightPx: 823.880615234375,
} as const

/**
 * On-screen size of the phone on step 7, measured from the Figma states section
 * (node 3984:6389): every state renders the preview at 298.9702453613281 × 650,
 * i.e. the 360×782.69 canvas at a uniform ≈0.8304 scale.
 *
 * Expressed in rem so the phone tracks the fluid root font inside the Admin
 * iframe, exactly like the rest of the wizard.
 */
export const PREVIEW_PHONE_BOX = {
  widthRem: 298.9702453613281 / 16,
  heightRem: 650 / 16,
} as const

/**
 * On-screen size of the phone on the step-8 review, where TWO of them stand
 * side by side inside the preview square.
 *
 * Measured on the drawn review `5387:91764`: the `Preview` slot is the 575
 * square, and the two `Preview` frames inside it are 239.1761932373047 × 520
 * at x=32.32 and x=303.5 — i.e. 32 apart, which is kit `spacing/32`, not the
 * 40 this panel used. 239.18 / 298.97 = 0.8 exactly, and 650 × 0.8 = 520, so
 * this is the step-7 phone at four fifths, not a different device.
 *
 * Why it had to be stated: until the responsive work the whole wizard shrank
 * with the Admin panel, so the step-7 box happened to come out near this size.
 * With the root fixed at 16 it does not, and the pair would outgrow the square.
 */
export const PREVIEW_REVIEW_PHONE_BOX = {
  widthRem: 239.1761932373047 / 16,
  heightRem: 520 / 16,
} as const

/** Kit `spacing/32` between the two review phones — `5387:91764`. */
export const PREVIEW_REVIEW_PHONE_GAP_CLASS = 'gap-8'

export type PreviewPlacement = 'top-fixed' | 'body' | 'bottom-fixed' | 'overlay'

export interface PreviewTypePlacement {
  placement: PreviewPlacement
  /**
   * Stacking order inside `body`, top to bottom. Kept in code rather than read
   * from `component_types.sort_order`: the DB column orders the admin library
   * (banners 1, tabbar 2, header 3, thumbnails 4), not the phone screen.
   */
  order: number
}

/**
 * Where each component type sits on the phone screen.
 *
 * A type absent from this map is not rendered. `ct_theme` is absent on purpose:
 * it has no representation in the UXUI-2554 mockups and is already filtered out
 * of the wizard accordion and the admin type list.
 */
export const PREVIEW_PLACEMENT: Record<string, PreviewTypePlacement> = {
  ct_header: { placement: 'top-fixed', order: 1 },
  ct_banners: { placement: 'body', order: 2 },
  ct_thumbnails: { placement: 'body', order: 3 },
  ct_tabbar: { placement: 'bottom-fixed', order: 4 },
  ct_sidebar: { placement: 'overlay', order: 5 },
}

export function getPreviewPlacement(typeId: string): PreviewTypePlacement | null {
  return PREVIEW_PLACEMENT[typeId] ?? null
}

/**
 * Heights of the two strips the sidebar keeps pinned while the rest of it
 * scrolls, in canvas design px. Measured on the sidebar slice in Figma
 * (node 5194:60779, 360×1033): the `popup/info title` frame carrying "Menu ×",
 * and the `time slot` frame carrying "Casino Time". The ~15 px gap between the
 * menu body and the time slot is left to the scrolling middle — the background
 * is uniformly dark there, so the seam is invisible either way.
 *
 * These live in code rather than on `component_variants` (owner's call,
 * 2026-08-25): the library has one sidebar variant, and a schema migration for
 * a single value does not pay for itself. Revisit if variants start differing.
 *
 * The slice's total height is deliberately absent — see
 * `resolveSidebarBandGeometry`.
 */
export const PREVIEW_SIDEBAR_BANDS = {
  topPx: 54.68086242675781,
  bottomPx: 34.340431213378906,
} as const

export interface SidebarBandGeometry {
  /** Pinned top strip — "Menu ×". */
  topHeightRem: string
  /** Pinned bottom strip — "Casino Time". */
  bottomHeightRem: string
  /**
   * Pulls the slice up past the top strip and back down past the bottom one, so
   * the scrolling window shows exactly the part neither strip does.
   *
   * Negative margins rather than an explicit height: inside a box that
   * establishes its own formatting context, the window's auto height resolves to
   * the image's margin-box height, i.e. `sliceHeight − top − bottom`. The
   * browser therefore still derives the slice height from the file, and a taller
   * sidebar keeps working without a code change.
   */
  middleMarginTopRem: string
  middleMarginBottomRem: string
}

/**
 * Sidebar strip geometry at a given canvas multiplier (see
 * `resolveCanvasUnitRem`). Pure so the sign of the middle offsets — the thing
 * that silently breaks the effect — is covered by a test.
 */
export function resolveSidebarBandGeometry(unitRem: number): SidebarBandGeometry {
  const topRem = PREVIEW_SIDEBAR_BANDS.topPx * unitRem
  const bottomRem = PREVIEW_SIDEBAR_BANDS.bottomPx * unitRem

  return {
    topHeightRem: `${topRem}rem`,
    bottomHeightRem: `${bottomRem}rem`,
    middleMarginTopRem: `${-topRem}rem`,
    middleMarginBottomRem: `${-bottomRem}rem`,
  }
}

/**
 * Size of one design px, in rem — the single multiplier the whole canvas is
 * scaled by. `rem` keeps the canvas in step with the fluid root font inside the
 * Admin iframe (see `html.wizard-embed` in app.css); standalone keeps a 16px
 * root, so one design px resolves to its exact original size.
 *
 * Contain-fit rather than width-fit, so a host box whose proportions drift from
 * the canvas shrinks the phone instead of clipping the fixed tabbar.
 */
export function resolveCanvasUnitRem(hostWidthRem: number, hostHeightRem: number): number {
  if (hostWidthRem <= 0 || hostHeightRem <= 0) return 0

  return Math.min(hostWidthRem / PREVIEW_CANVAS.widthPx, hostHeightRem / PREVIEW_CANVAS.heightPx)
}
