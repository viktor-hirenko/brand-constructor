import { describe, it, expect } from 'vitest'
import {
  CEO_GENERAL_COMMENT_MAX_HEIGHT_PX,
  CEO_GENERAL_COMMENT_MIN_HEIGHT_PX,
  CEO_SECTION_COMMENT_MAX_HEIGHT_PX,
  computeCappedTextareaLayout,
} from '@/constants/ceoCommentFieldVisual'

describe('computeCappedTextareaLayout', () => {
  it('grows with content up to max height', () => {
    expect(computeCappedTextareaLayout(48)).toEqual({
      heightPx: 48,
      overflowY: 'hidden',
    })
  })

  it('caps at max height and enables scroll', () => {
    const tall = CEO_SECTION_COMMENT_MAX_HEIGHT_PX + 80
    expect(computeCappedTextareaLayout(tall)).toEqual({
      heightPx: CEO_SECTION_COMMENT_MAX_HEIGHT_PX,
      overflowY: 'auto',
    })
  })

  it('treats exact max height as no scroll', () => {
    expect(computeCappedTextareaLayout(CEO_SECTION_COMMENT_MAX_HEIGHT_PX)).toEqual({
      heightPx: CEO_SECTION_COMMENT_MAX_HEIGHT_PX,
      overflowY: 'hidden',
    })
  })

  it('applies min height for general comment when content is shorter', () => {
    expect(
      computeCappedTextareaLayout(24, CEO_GENERAL_COMMENT_MAX_HEIGHT_PX, CEO_GENERAL_COMMENT_MIN_HEIGHT_PX),
    ).toEqual({
      heightPx: CEO_GENERAL_COMMENT_MIN_HEIGHT_PX,
      overflowY: 'hidden',
    })
  })

  it('caps general comment higher than section comment', () => {
    expect(CEO_GENERAL_COMMENT_MAX_HEIGHT_PX).toBeGreaterThan(CEO_SECTION_COMMENT_MAX_HEIGHT_PX)
    expect(CEO_GENERAL_COMMENT_MIN_HEIGHT_PX).toBeGreaterThan(CEO_SECTION_COMMENT_MAX_HEIGHT_PX)
  })
})
