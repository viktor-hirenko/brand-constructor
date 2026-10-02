import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Brand, BrandStepData } from '@brand-constructor/shared/types'

const apiPut = vi.fn()
vi.mock('@/composables/useApi', () => ({
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

import { useConstructorStore } from '@/stores/constructor'
import { applyBrandToStore } from '@/utils/brandHydration'
import { briefDraftStorageKey } from '@/domain/persistence/briefDraftStorageKey'

/**
 * H-25, H-26, H-27 (run 02.10: D-01, D-02, D-04, D-10, D-11, D-20, D-21, D-50,
 * D-51). A brief has an id from «Order New Brand» on, and the browser copy of
 * the draft was written for a brief WITHOUT an id only — so nothing typed on a
 * step survived F5, a closed tab or an expired session.
 *
 * «F5» here is a fresh Pinia over the same localStorage, then the same load
 * the route guards do (`applyBrandToStore`).
 */

const ID = 'brand_test'
const KEY = briefDraftStorageKey(ID, 'wizard-draft')
const T1 = '2026-10-02T10:00:00.000Z'
const T2 = '2026-10-02T11:00:00.000Z'

function serverStepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: [], launchDate: '', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'concept-a', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: [], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: null, comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
  }
}

function serverBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: ID,
    status: 'draft',
    currentStep: 3,
    stepData: serverStepData(),
    updatedAt: T1,
    ...overrides,
  } as Brand
}

/** A cold start: new stores, same browser storage, brief loaded from the server. */
function openBrief(brand: Brand = serverBrand()) {
  setActivePinia(createPinia())
  const store = useConstructorStore()
  applyBrandToStore(store, brand)
  return store
}

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  apiPut.mockReset()
})

describe('browser copy of a draft that already has an id', () => {
  it('what was entered on a step is back after F5 (D-01, D-02, D-20)', async () => {
    const store = openBrief()
    store.setBrandBasics({ geo: ['UA'], launchDate: '2026-12-01', comment: 'before Далі' })
    store.toggleExternalNaming('exn-1')
    await nextTick()

    const reopened = openBrief()
    expect(reopened.stepData.brandBasics.geo).toEqual(['UA'])
    expect(reopened.stepData.brandBasics.launchDate).toBe('2026-12-01')
    expect(reopened.stepData.brandBasics.comment).toBe('before Далі')
    expect(reopened.stepData.externalNaming.selectedIds).toEqual(['exn-1'])
  })

  it('an order saved in its window is back after F5 (D-04)', async () => {
    const store = openBrief()
    store.setNewConceptBrief({ description: 'new concept' } as never)
    await nextTick()

    expect(openBrief().stepData.concept.newConceptBrief).toEqual({ description: 'new concept' })
  })

  it('the server wins when the brief was saved elsewhere in the meantime', async () => {
    const store = openBrief()
    store.toggleExternalNaming('exn-1')
    await nextTick()

    const reopened = openBrief(serverBrand({ updatedAt: T2 }))
    expect(reopened.stepData.externalNaming.selectedIds).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('a successful save drops the copy; later changes sit on the new server state', async () => {
    apiPut.mockResolvedValue({ id: ID, status: 'draft', updatedAt: T2 })
    const store = openBrief()
    store.toggleExternalNaming('exn-1')
    await nextTick()
    expect(localStorage.getItem(KEY)).not.toBeNull()

    expect(await store.saveBrand()).toBe(true)
    expect(localStorage.getItem(KEY)).toBeNull()

    store.selectInternalNaming('int-1')
    await nextTick()
    const saved = { ...serverStepData(), externalNaming: { selectedIds: ['exn-1'], comment: '', newNamingBrief: null } }
    const reopened = openBrief(serverBrand({ updatedAt: T2, stepData: saved }))
    expect(reopened.stepData.internalNaming.selectedId).toBe('int-1')
  })

  it('a save that dies on an expired session keeps what was entered (D-50)', async () => {
    apiPut.mockRejectedValue(new Error('Unauthorized'))
    const store = openBrief()
    store.toggleExternalNaming('exn-1')
    await nextTick()

    expect(await store.saveBrand()).toBe(false)
    expect(openBrief().stepData.externalNaming.selectedIds).toEqual(['exn-1'])
  })

  it('undoing a change leaves no copy behind', async () => {
    const store = openBrief()
    store.toggleExternalNaming('exn-1')
    await nextTick()
    store.toggleExternalNaming('exn-1')
    await nextTick()

    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('is not kept for a brief that is no longer a draft', async () => {
    const store = openBrief(serverBrand({ status: 'needs_revision' }))
    store.toggleExternalNaming('exn-1')
    await nextTick()

    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('a section re-edited from the final review («Редагувати»)', () => {
  it('abandoned by F5 leaves the brief as it was (D-05)', async () => {
    const store = openBrief()
    store.beginEditSection('concept', 8)
    store.setConcept({ selectedId: 'concept-b' })
    await nextTick()

    expect(openBrief().stepData.concept.selectedId).toBe('concept-a')
  })

  it('«Скасувати» leaves no copy of the edit', async () => {
    const store = openBrief()
    store.beginEditSection('concept', 8)
    store.setConcept({ selectedId: 'concept-b' })
    await nextTick()
    store.cancelEditSection()
    await nextTick()

    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('«Зберегти» on an expired session keeps the edit (D-51)', async () => {
    apiPut.mockRejectedValue(new Error('Unauthorized'))
    const store = openBrief()
    store.beginEditSection('marketingPackage', 8)
    store.setMarketingPackage({ selectedId: 'pkg-2' })
    await nextTick()

    expect(await store.saveBrand()).toBe(false)
    expect(openBrief().stepData.marketingPackage.selectedId).toBe('pkg-2')
  })
})
