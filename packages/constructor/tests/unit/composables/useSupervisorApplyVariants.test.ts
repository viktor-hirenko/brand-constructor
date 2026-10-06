import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Concept, ExternalNaming, InternalNaming } from '@brand-constructor/shared/types'

const mockStore = {
  brandId: 'brand-test-1',
  brandCeoSelections: null as Record<string, string | string[] | undefined> | null,
  brandCeoComments: null as Record<string, { value: string; resolved?: boolean }> | null,
  stepData: {
    concept: { selectedId: 'po-concept' as string | null, comment: '', newConceptBrief: null as unknown },
    externalNaming: { selectedIds: ['ext-a', 'ext-b', 'ext-c'] as string[], newNamingBrief: null as unknown },
    internalNaming: { selectedId: 'po-internal' as string | null, newNamingFeedback: null as string | null },
  },
  authorRevisionDraft: { resolvedConflictSections: [] as string[] },
}

vi.mock('@/stores/constructor', () => ({
  useConstructorStore: () => mockStore,
}))

import { useSupervisorApplyVariants } from '@/composables/useSupervisorApplyVariants'

const externalNamings = ref<ExternalNaming[]>([
  { id: 'ext-a', name: 'Alpha', domain: 'alpha.test' } as ExternalNaming,
  { id: 'ext-b', name: 'Beta', domain: 'beta.test' } as ExternalNaming,
  { id: 'ext-c', name: 'Charlie', domain: 'charlie.test' } as ExternalNaming,
  { id: 'ext-d', name: 'Delta', domain: 'delta.test' } as ExternalNaming,
])

function createApplyVariants(returned = false) {
  return useSupervisorApplyVariants({
    isPoReturnedView: computed(() => returned),
    concepts: ref<Concept[]>([]),
    externalNamings,
    internalNamings: ref<InternalNaming[]>([]),
    router: { push: vi.fn() } as never,
  })
}

describe('useSupervisorApplyVariants — ceoExternalItemsForReview', () => {
  beforeEach(() => {
    mockStore.brandCeoSelections = null
    mockStore.stepData.externalNaming.selectedIds = ['ext-a', 'ext-b', 'ext-c']
  })

  it('returns empty when CEO has not changed external naming', () => {
    const apply = createApplyVariants()
    expect(apply.ceoExternalItemsForReview.value).toEqual([])
  })

  it('returns empty when CEO selection matches PO exactly', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-a', 'ext-b', 'ext-c'] }
    const apply = createApplyVariants()
    expect(apply.ceoExternalItemsForReview.value).toEqual([])
  })

  it('returns full CEO set on partial overlap (not only the diff)', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-a', 'ext-b', 'ext-d'] }
    const apply = createApplyVariants()

    expect(apply.ceoExternalItemsForReview.value).toEqual([
      { id: 'ext-a', name: 'Alpha', domain: 'alpha.test', note: null },
      { id: 'ext-b', name: 'Beta', domain: 'beta.test', note: null },
      { id: 'ext-d', name: 'Delta', domain: 'delta.test', note: null },
    ])
  })

  it('returns full CEO set on complete replacement', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-d'] }
    mockStore.stepData.externalNaming.selectedIds = ['ext-a', 'ext-b', 'ext-c']
    const apply = createApplyVariants()

    expect(apply.ceoExternalItemsForReview.value).toEqual([
      { id: 'ext-d', name: 'Delta', domain: 'delta.test', note: null },
    ])
  })

  it('returns subset when CEO picked fewer names than PO', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-a', 'ext-b'] }
    const apply = createApplyVariants()

    expect(apply.ceoExternalItemsForReview.value).toEqual([
      { id: 'ext-a', name: 'Alpha', domain: 'alpha.test', note: null },
      { id: 'ext-b', name: 'Beta', domain: 'beta.test', note: null },
    ])
  })
})

/**
 * Phase 4 of the brief-orders plan: the author answers the CEO's alternative
 * with an order. That section is settled — otherwise «Відправити в роботу»
 * stays grey for good, since External Naming cannot even be edited while a new
 * concept is on order.
 */
describe('useSupervisorApplyVariants — an order settles the CEO alternative (returned view)', () => {
  beforeEach(() => {
    mockStore.brandCeoComments = null
    mockStore.brandCeoSelections = { concept: 'ceo-concept', externalNaming: ['ext-d'], internalNaming: 'ceo-internal' }
    mockStore.authorRevisionDraft.resolvedConflictSections = []
    mockStore.stepData.concept.selectedId = 'po-concept'
    mockStore.stepData.concept.newConceptBrief = null
    mockStore.stepData.externalNaming.selectedIds = ['ext-a']
    mockStore.stepData.externalNaming.newNamingBrief = null
    mockStore.stepData.internalNaming.selectedId = 'po-internal'
    mockStore.stepData.internalNaming.newNamingFeedback = null
  })

  it('three open alternatives without orders', () => {
    const apply = createApplyVariants(true)
    expect(apply.attentionCounter.value).toBe(3)
    expect(apply.submitBlocked.value).toBe(true)
  })

  it('a new concept on order settles Concept and External Naming', () => {
    mockStore.stepData.concept.selectedId = null
    mockStore.stepData.concept.newConceptBrief = { conceptFeedback: 'brighter' }
    mockStore.stepData.externalNaming.selectedIds = []
    const apply = createApplyVariants(true)
    expect(apply.attentionCounter.value).toBe(1)
    expect(apply.sectionApplyFlags.value).toEqual({
      conceptNeedsChoice: false,
      externalNamingNeedsChoice: false,
      internalNamingNeedsChoice: true,
    })
    expect(apply.hasConceptMismatch.value).toBe(false)
  })

  it('every section on order: nothing blocks «Відправити в роботу»', () => {
    mockStore.stepData.concept.selectedId = null
    mockStore.stepData.concept.newConceptBrief = {}
    mockStore.stepData.externalNaming.selectedIds = []
    mockStore.stepData.internalNaming.selectedId = null
    mockStore.stepData.internalNaming.newNamingFeedback = 'shorter'
    const apply = createApplyVariants(true)
    expect(apply.attentionCounter.value).toBe(0)
    expect(apply.submitBlocked.value).toBe(false)
  })

  it('an unresolved CEO comment still counts, order or not', () => {
    mockStore.brandCeoComments = { internalNaming: { value: 'інша назва', resolved: false } }
    mockStore.stepData.internalNaming.selectedId = null
    mockStore.stepData.internalNaming.newNamingFeedback = 'shorter'
    mockStore.brandCeoSelections = {}
    const apply = createApplyVariants(true)
    expect(apply.attentionCounter.value).toBe(1)
  })
})
