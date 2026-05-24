import { describe, expect, it } from 'vitest'
import {
  countSectionsNeedingAttention,
  isCeoChoiceAnAlternative,
  isSubmitBlockedForReturnedView,
} from '@/utils/ceoRevisionGate'

const poSelections = {
  conceptId: 'po-concept',
  externalIds: ['po-ext-1'],
  internalId: 'po-internal',
}

describe('isCeoChoiceAnAlternative', () => {
  it('detects concept mismatch', () => {
    expect(isCeoChoiceAnAlternative('concept', 'ceo-concept', poSelections)).toBe(true)
    expect(isCeoChoiceAnAlternative('concept', 'po-concept', poSelections)).toBe(false)
  })

  it('detects external naming mismatch by length and membership', () => {
    expect(isCeoChoiceAnAlternative('externalNaming', ['po-ext-1', 'ceo-ext-2'], poSelections)).toBe(
      true
    )
    expect(isCeoChoiceAnAlternative('externalNaming', ['po-ext-1'], poSelections)).toBe(false)
  })

  it('detects internal naming mismatch', () => {
    expect(isCeoChoiceAnAlternative('internalNaming', 'ceo-internal', poSelections)).toBe(true)
  })
})

describe('countSectionsNeedingAttention', () => {
  it('counts unresolved CEO comments', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { basics: { value: 'Fix geo', resolved: false } },
        ceoSelections: {},
        poSelections,
      })
    ).toBe(1)
  })

  it('ignores resolved comments', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { basics: { value: 'Fixed', resolved: true } },
        ceoSelections: {},
        poSelections,
      })
    ).toBe(0)
  })

  it('counts undecided CEO library alternatives', () => {
    expect(
      countSectionsNeedingAttention({
        comments: {},
        ceoSelections: { concept: 'ceo-concept' },
        poSelections,
      })
    ).toBe(1)
  })

  it('does not count general comments (not in attention keys)', () => {
    expect(
      countSectionsNeedingAttention({
        comments: { general: { value: 'Note', resolved: false } },
        ceoSelections: {},
        poSelections,
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
        poSelections,
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
        poSelections,
      })
    ).toBe(false)
  })
})
