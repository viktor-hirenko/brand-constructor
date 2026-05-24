import { describe, expect, it } from 'vitest'
import {
  getExternalNamingCommentHint,
  isExternalNamingCommentRequired,
  isExternalNamingStepValid,
} from '@/utils/externalNamingValidation'

const namings = [
  { id: 'free-1', availability_status: 'available' as const },
  { id: 'sold-1', availability_status: 'sold' as const },
  { id: 'free-2', availability_status: 'available' as const },
]

describe('isExternalNamingCommentRequired', () => {
  it('returns false for empty selection', () => {
    expect(isExternalNamingCommentRequired([], namings)).toBe(false)
  })

  it('returns false for a single available name', () => {
    expect(isExternalNamingCommentRequired(['free-1'], namings)).toBe(false)
  })

  it('returns true for multiple names', () => {
    expect(isExternalNamingCommentRequired(['free-1', 'free-2'], namings)).toBe(true)
  })

  it('returns true for a sold name', () => {
    expect(isExternalNamingCommentRequired(['sold-1'], namings)).toBe(true)
  })
})

describe('getExternalNamingCommentHint', () => {
  it('returns empty hint when comment is not required', () => {
    expect(getExternalNamingCommentHint(['free-1'], namings)).toBe('')
  })

  it('returns combined hint for multiple sold names', () => {
    expect(getExternalNamingCommentHint(['free-1', 'sold-1'], namings)).toBe(
      "Коментар обов'язковий при виборі кількох назв або викупленої назви"
    )
  })
})

describe('isExternalNamingStepValid', () => {
  it('allows step when PO submits a new naming brief', () => {
    expect(isExternalNamingStepValid([], '', true, namings)).toBe(true)
  })

  it('blocks empty selection without brief', () => {
    expect(isExternalNamingStepValid([], '', false, namings)).toBe(false)
  })

  it('blocks sold selection without comment', () => {
    expect(isExternalNamingStepValid(['sold-1'], '   ', false, namings)).toBe(false)
  })

  it('allows sold selection with comment', () => {
    expect(isExternalNamingStepValid(['sold-1'], 'Reserved for launch', false, namings)).toBe(
      true
    )
  })
})
