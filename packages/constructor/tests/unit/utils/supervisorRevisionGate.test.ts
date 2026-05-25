import { describe, expect, it } from 'vitest'
import {
  countSectionsNeedingAttention,
  isSupervisorChoiceAnAlternative,
  isSubmitBlockedForReturnedView,
} from '@/utils/supervisorRevisionGate'

const authorSelections = {
  conceptId: 'po-concept',
  externalIds: ['po-ext-1'],
  internalId: 'po-internal',
}

describe('isSupervisorChoiceAnAlternative', () => {
  it('detects concept mismatch', () => {
    expect(isSupervisorChoiceAnAlternative('concept', 'ceo-concept', authorSelections)).toBe(true)
    expect(isSupervisorChoiceAnAlternative('concept', 'po-concept', authorSelections)).toBe(false)
  })

  it('detects external naming mismatch by length and membership', () => {
    expect(isSupervisorChoiceAnAlternative('externalNaming', ['po-ext-1', 'ceo-ext-2'], authorSelections)).toBe(
      true
    )
    expect(isSupervisorChoiceAnAlternative('externalNaming', ['po-ext-1'], authorSelections)).toBe(false)
  })

  it('detects internal naming mismatch', () => {
    expect(isSupervisorChoiceAnAlternative('internalNaming', 'ceo-internal', authorSelections)).toBe(true)
  })
})

describe('countSectionsNeedingAttention', () => {
  it('counts unresolved CEO comments', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { basics: { value: 'Fix geo', resolved: false } },
        ceoSelections: {},
        authorSelections,
      })
    ).toBe(1)
  })

  it('ignores resolved comments', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { basics: { value: 'Fixed', resolved: true } },
        ceoSelections: {},
        authorSelections,
      })
    ).toBe(0)
  })

  it('counts undecided CEO library alternatives', () => {
    expect(
      countSectionsNeedingAttention({
        comments: {},
        ceoSelections: { concept: 'ceo-concept' },
        authorSelections,
      })
    ).toBe(1)
  })

  it('does not count general comments (not in attention keys)', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { general: { value: 'Note', resolved: false } },
        ceoSelections: {},
        authorSelections,
      })
    ).toBe(0)
  })
})

describe('isSubmitBlockedForReturnedView', () => {
  it('blocks submit while attention items remain', () => {
    expect(
      isSubmitBlockedForReturnedView({
        comments: { deliverables: { value: 'Need deadline', resolved: false } },
        ceoSelections: {},
        authorSelections,
      })
    ).toBe(true)
  })

  it('allows submit when all sections are clear', () => {
    expect(
      isSubmitBlockedForReturnedView({
        comments: {},
        ceoSelections: {
          concept: 'po-concept',
          externalNaming: ['po-ext-1'],
          internalNaming: 'po-internal',
        },
        authorSelections,
      })
    ).toBe(false)
  })
})
