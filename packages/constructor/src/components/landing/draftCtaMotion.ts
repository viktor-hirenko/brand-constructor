/** Panel leave — keep in sync with Vue transition + corner release timer. */
export const DRAFT_PANEL_LEAVE_MS = 540

/** When square corners start rounding during close (panel still covers seam). */
export const DRAFT_CORNERS_RELEASE_MS = 180

export const DRAFT_CORNERS_ROUND_MS = DRAFT_PANEL_LEAVE_MS - DRAFT_CORNERS_RELEASE_MS

export const DRAFT_MOTION_DURATION_OPEN_MS = 480

export const DRAFT_MOTION_EASE_OPEN = 'cubic-bezier(0.22, 1, 0.32, 1)'

export const DRAFT_MOTION_EASE_CLOSE = 'cubic-bezier(0.33, 0, 0.12, 1)'

export const draftCtaMotionStyle: Record<string, string> = {
  '--draft-motion-duration-open': `${DRAFT_MOTION_DURATION_OPEN_MS}ms`,
  '--draft-motion-duration-close': `${DRAFT_PANEL_LEAVE_MS}ms`,
  '--draft-motion-ease-open': DRAFT_MOTION_EASE_OPEN,
  '--draft-motion-ease-close': DRAFT_MOTION_EASE_CLOSE,
  '--draft-corner-round-duration': `${DRAFT_CORNERS_ROUND_MS}ms`,
}
