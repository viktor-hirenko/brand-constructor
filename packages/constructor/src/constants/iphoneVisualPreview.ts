/** iPhone 16 Plus light frame asset used for Visual Components preview. */
export const IPHONE_FRAME_SRC = '/assets/iphone-16-plus-light.png'

/** Outer device chrome (matches Figma / step 7 reference). */
export const IPHONE_FRAME = {
  widthPx: 311.25,
  heightPx: 632.25,
} as const

/** Screen viewport inset inside the frame — single source for step 7 + final review. */
export const IPHONE_VIEWPORT = {
  widthPx: 288.75,
  heightPx: 614.25,
  leftPx: 11,
  topPx: 9,
  borderRadiusPx: 40,
} as const
