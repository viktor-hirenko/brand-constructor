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
 * The chassis overflows the canvas — side buttons and drop shadow stick out —
 * hence the negative offsets, and hence the canvas must not clip its overflow.
 * Content is unaffected: it starts at y=62, well inside the aperture.
 *
 * Public assets must respect the app `base` (`/wizard/` unified, `/` standalone).
 */
export const PREVIEW_CHASSIS = {
  src: `${import.meta.env.BASE_URL}assets/phone-chassis.png`,
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
