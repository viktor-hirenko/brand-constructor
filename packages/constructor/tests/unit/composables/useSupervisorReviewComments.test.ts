import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'

const mockStore = {
  brandCeoComments: null as Record<string, { value: string; resolved: boolean }> | null,
  brandCeoSelections: null as Record<string, unknown> | null,
  setCeoCommentValue: vi.fn(),
}

vi.mock('@/stores/constructor', () => ({
  useConstructorStore: () => mockStore,
}))

import { useSupervisorReviewComments } from '@/composables/useSupervisorReviewComments'

describe('useSupervisorReviewComments', () => {
  const isPoReturnedView = computed(() => false)
  const isCeoChoiceAnAlternative = vi.fn(() => false)

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.brandCeoComments = null
    mockStore.brandCeoSelections = null
  })

  describe('validateNeedsRevision', () => {
    it('flags all empty section fields when no CEO comments exist', () => {
      const comments = useSupervisorReviewComments({ isPoReturnedView, isCeoChoiceAnAlternative })

      const result = comments.validateNeedsRevision()

      expect(result).toEqual({ ok: false, reason: 'no-comment' })
      expect(comments.revisionRequiresAnyComment.value).toBe(true)
      expect(comments.revisionMissingSections.value).toEqual(
        new Set([
          'basics',
          'concept',
          'externalNaming',
          'internalNaming',
          'marketingPackage',
          'deliverables',
          'visualComponents',
        ]),
      )
    })

    it('clears all no-comment highlights when CEO starts typing in any section', () => {
      const comments = useSupervisorReviewComments({ isPoReturnedView, isCeoChoiceAnAlternative })
      comments.validateNeedsRevision()

      comments.handleCeoCommentBySection('deliverables', 'Need fix')

      expect(comments.revisionRequiresAnyComment.value).toBe(false)
      expect(comments.revisionMissingSections.value.size).toBe(0)
    })

    it('still requires comments on alternative-pick sections', () => {
      isCeoChoiceAnAlternative.mockReturnValue(true)
      mockStore.brandCeoSelections = { concept: 'ceo-alt' }
      const comments = useSupervisorReviewComments({ isPoReturnedView, isCeoChoiceAnAlternative })
      comments.ceoComments.general = 'Overall note'

      const result = comments.validateNeedsRevision()

      expect(result).toEqual({ ok: false, reason: 'missing-section' })
      expect(comments.revisionMissingSections.value).toEqual(new Set(['concept']))
      expect(comments.revisionRequiresAnyComment.value).toBe(false)
    })
  })
})
