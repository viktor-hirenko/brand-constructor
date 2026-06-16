import { describe, expect, it } from 'vitest'
import { isSectionCommentBlockVisible } from '@/utils/sectionCommentBlockVisibility'

const hidden = { supervisorEditable: false }

describe('isSectionCommentBlockVisible', () => {
  it('returns false for PO draft section without comments', () => {
    expect(isSectionCommentBlockVisible(hidden)).toBe(false)
  })

  it('returns true when PO author comment is present', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        authorComment: '  Need another geo  ',
      })
    ).toBe(true)
  })

  it('returns true for CEO review even when section has no comments yet', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        supervisorEditable: true,
      })
    ).toBe(true)
  })

  it('returns true for CEO general comment block (always expanded)', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        supervisorEditable: true,
        alwaysExpanded: true,
      })
    ).toBe(true)
  })

  it('returns true for PO returned view with resolve UI', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        showResolveUi: true,
        supervisorComment: 'Fix naming',
      })
    ).toBe(true)
  })

  it('returns true for approved view with persisted CEO comment only', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        supervisorComment: 'Approved with note',
      })
    ).toBe(true)
  })

  it('returns true when both PO and CEO comments are present', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        authorComment: 'PO note',
        supervisorComment: 'CEO note',
      })
    ).toBe(true)
  })

  it('returns false when comments are whitespace-only', () => {
    expect(
      isSectionCommentBlockVisible({
        ...hidden,
        authorComment: '   ',
        supervisorComment: '\n',
      })
    ).toBe(false)
  })

  it('returns true for ceo-frozen read-only when CEO comment exists', () => {
    expect(
      isSectionCommentBlockVisible({
        supervisorEditable: false,
        supervisorComment: 'Sent back for revision',
      })
    ).toBe(true)
  })
})
