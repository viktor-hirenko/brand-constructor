import { describe, it, expect } from 'vitest'
import {
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
})
