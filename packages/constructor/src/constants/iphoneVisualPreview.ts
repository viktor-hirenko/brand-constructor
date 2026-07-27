/** iPhone 16 Plus light frame asset used for Visual Components preview.
 *  File lives in `public/assets/` (copied as-is by Vite). Unlike API/R2 URLs,
 *  public assets must respect the app `base` (`/wizard/` unified, `/` standalone). */
export const IPHONE_FRAME_SRC = `${import.meta.env.BASE_URL}assets/iphone-16-plus-light.png`

/*
 * Sizes are expressed in `rem` so the phone scales with the fluid root font in
 * embedded mode (see `html.wizard-embed` in app.css). Standalone keeps a 16px
 * root, so `rem` resolves to the exact original px (values ÷ 16).
 */

/** Outer device chrome (matches Figma / step 7 reference). Original px in comments. */
export const IPHONE_FRAME = {
  widthRem: 19.453125, // 311.25px
  heightRem: 39.515625, // 632.25px
} as const

/** Screen viewport inset inside the frame — single source for step 7 + final review. */
export const IPHONE_VIEWPORT = {
  widthRem: 18.046875, // 288.75px
  heightRem: 38.390625, // 614.25px
  leftRem: 0.6875, // 11px
  topRem: 0.5625, // 9px
  borderRadiusRem: 2.5, // 40px
} as const
