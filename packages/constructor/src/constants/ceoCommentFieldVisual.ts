/**
 * Layout tokens for CEO inline comment textareas on the step-10 review screen.
 * Both section-level and general CEO fields use a capped height with internal scroll.
 */

/** Matches SectionCommentBlock textarea `leading-6` (24px). */
export const CEO_SECTION_COMMENT_LINE_HEIGHT_PX = 24

/** Visible line count before the section CEO textarea scrolls internally. */
export const CEO_SECTION_COMMENT_MAX_VISIBLE_LINES = 5

export const CEO_SECTION_COMMENT_MAX_HEIGHT_PX =
  CEO_SECTION_COMMENT_LINE_HEIGHT_PX * CEO_SECTION_COMMENT_MAX_VISIBLE_LINES

export interface CappedTextareaLayout {
  heightPx: number
  overflowY: 'auto' | 'hidden'
}

/**
 * Returns pixel height and overflow for a CEO comment textarea after measuring
 * `scrollHeight`. Content shorter than the cap grows naturally; taller content
 * stays at the cap and scrolls inside the field.
 */
export function computeCappedTextareaLayout(
  scrollHeightPx: number,
  maxHeightPx: number = CEO_SECTION_COMMENT_MAX_HEIGHT_PX,
): CappedTextareaLayout {
  if (scrollHeightPx <= maxHeightPx) {
    return { heightPx: scrollHeightPx, overflowY: 'hidden' }
  }
  return { heightPx: maxHeightPx, overflowY: 'auto' }
}
