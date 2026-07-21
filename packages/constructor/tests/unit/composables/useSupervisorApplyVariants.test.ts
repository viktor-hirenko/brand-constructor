import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Concept, ExternalNaming, InternalNaming } from '@brand-constructor/shared/types'

const mockStore = {
  brandId: 'brand-test-1',
  brandCeoSelections: null as Record<string, string | string[] | undefined> | null,
  brandCeoComments: null as Record<string, { value: string; resolved?: boolean }> | null,
  stepData: {
    concept: { selectedId: 'po-concept' as string | null, comment: '' },
    externalNaming: { selectedIds: ['ext-a', 'ext-b', 'ext-c'] as string[] },
    internalNaming: { selectedId: 'po-internal' as string | null },
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

function createApplyVariants() {
  return useSupervisorApplyVariants({
    isPoReturnedView: computed(() => false),
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
      { id: 'ext-a', name: 'Alpha', domain: 'alpha.test' },
      { id: 'ext-b', name: 'Beta', domain: 'beta.test' },
      { id: 'ext-d', name: 'Delta', domain: 'delta.test' },
    ])
  })

  it('returns full CEO set on complete replacement', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-d'] }
    mockStore.stepData.externalNaming.selectedIds = ['ext-a', 'ext-b', 'ext-c']
    const apply = createApplyVariants()

    expect(apply.ceoExternalItemsForReview.value).toEqual([
      { id: 'ext-d', name: 'Delta', domain: 'delta.test' },
    ])
  })

  it('returns subset when CEO picked fewer names than PO', () => {
    mockStore.brandCeoSelections = { externalNaming: ['ext-a', 'ext-b'] }
    const apply = createApplyVariants()

    expect(apply.ceoExternalItemsForReview.value).toEqual([
      { id: 'ext-a', name: 'Alpha', domain: 'alpha.test' },
      { id: 'ext-b', name: 'Beta', domain: 'beta.test' },
    ])
  })
})
