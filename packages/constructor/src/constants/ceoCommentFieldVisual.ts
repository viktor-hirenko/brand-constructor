/**
 * Layout tokens for CEO inline comment textareas on the step-10 review screen.
 * Section fields cap lower; the general comment field is taller by default and scrolls later.
 */

/** Matches SectionCommentBlock textarea `leading-6` (24px). */
export const CEO_COMMENT_LINE_HEIGHT_PX = 24

/** Visible line count before a section CEO textarea scrolls internally. */
export const CEO_SECTION_COMMENT_MAX_VISIBLE_LINES = 5

export const CEO_SECTION_COMMENT_MAX_HEIGHT_PX =
  CEO_COMMENT_LINE_HEIGHT_PX * CEO_SECTION_COMMENT_MAX_VISIBLE_LINES

/** Minimum visible lines for the general CEO comment (empty or short text). */
export const CEO_GENERAL_COMMENT_MIN_VISIBLE_LINES = 6

export const CEO_GENERAL_COMMENT_MIN_HEIGHT_PX =
  CEO_COMMENT_LINE_HEIGHT_PX * CEO_GENERAL_COMMENT_MIN_VISIBLE_LINES

/** Visible line count before the general CEO textarea scrolls internally. */
export const CEO_GENERAL_COMMENT_MAX_VISIBLE_LINES = 12

export const CEO_GENERAL_COMMENT_MAX_HEIGHT_PX =
  CEO_COMMENT_LINE_HEIGHT_PX * CEO_GENERAL_COMMENT_MAX_VISIBLE_LINES

export interface CappedTextareaLayout {
  heightPx: number
  overflowY: 'auto' | 'hidden'
}

/**
 * Returns pixel height and overflow for a CEO comment textarea after measuring
 * `scrollHeight`. Optional `minHeightPx` enforces a floor (general comment).
 * Content taller than the cap scrolls inside the field.
 */
export function computeCappedTextareaLayout(
  scrollHeightPx: number,
  maxHeightPx: number = CEO_SECTION_COMMENT_MAX_HEIGHT_PX,
  minHeightPx?: number,
): CappedTextareaLayout {
  const contentHeightPx = minHeightPx
    ? Math.max(scrollHeightPx, minHeightPx)
    : scrollHeightPx

  if (contentHeightPx <= maxHeightPx) {
    return { heightPx: contentHeightPx, overflowY: 'hidden' }
  }
  return { heightPx: maxHeightPx, overflowY: 'auto' }
}
