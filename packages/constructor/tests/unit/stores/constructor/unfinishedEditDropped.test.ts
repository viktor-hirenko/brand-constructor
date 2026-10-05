import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import type { BrandStepData } from '@brand-constructor/shared/types'

vi.mock('@/composables/useApi', () => ({
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiErrorStatus: () => undefined,
}))

import { useConstructorStore } from '@/stores/constructor'
import { editFlowLeaveAction } from '@/router/editFlowLeave'
import { resolveColdStartNavigation } from '@/router/coldStartNavigation'
import { briefDraftStorageKey } from '@/domain/persistence/briefDraftStorageKey'

/**
 * H-03 and H-02 on screen (run 02.10: D-07, D-12, D-13). An edit opened from
 * the review and left without «Зберегти» — by F5, «назад» of the browser or a
 * link — has to be dropped, the way «Скасувати» drops it and the way a draft
 * already worked (D-05). On a returned brief it was kept in the browser and put
 * back, and the review showed a concept the server did not have; in a draft
 * «назад» ×2 left a new concept with no names and an open «На погодження CEO».
 */

const ID = 'brand_rev'
const REVISION_KEY = briefDraftStorageKey(ID, 'author-revision')

function serverStepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-wonka', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-joymus'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'inn-luna', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
  }
}

/** Opening the brief: fresh stores over the same browser storage, then the route guard's restore. */
function openBrief(status = 'needs_revision') {
  setActivePinia(createPinia())
  const store = useConstructorStore()
  store.loadBrand(ID, serverStepData(), 8, status)
  store.restoreAuthorRevisionDraftFromStorage(ID)
  return store
}

/** «Редагувати» Concept → another concept → «Далі», as the revision screens do it. */
function revisionConceptChangedAndNext(store: ReturnType<typeof useConstructorStore>) {
  store.captureAuthorRevisionBaselineConcept(store.stepData.concept.selectedId)
  store.beginEditSection('concept', 8)
  store.setAuthorRevisionPendingConcept('con-wonderland')
  store.captureAuthorRevisionBaselineExternal(store.stepData.externalNaming.selectedIds)
  store.setConcept({ selectedId: 'con-wonderland', newConceptBrief: null })
  // the names screen opens with nothing picked
  store.setExternalNaming({ selectedIds: [], newNamingBrief: null })
}

beforeEach(() => {
  vi.useFakeTimers()
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a returned brief: F5 in the middle of an edit (D-07)', () => {
  it('the review shows what the server has, not the half-done edit', async () => {
    const store = openBrief()
    revisionConceptChangedAndNext(store)
    store.toggleExternalNaming('exn-wonder-1')
    await vi.advanceTimersByTimeAsync(1000)

    const reopened = openBrief()
    expect(reopened.stepData.concept.selectedId).toBe('con-wonka')
    expect(reopened.stepData.externalNaming.selectedIds).toEqual(['exn-joymus'])
    expect(reopened.editingSection).toBeNull()
  })

  it('a copy written before 05.10 (with the whole brief in it) is not put back either', () => {
    const overlay = { ...serverStepData(), concept: { ...serverStepData().concept, selectedId: 'con-wonderland' } }
    localStorage.setItem(
      REVISION_KEY,
      JSON.stringify({
        briefId: ID,
        savedAt: Date.now(),
        briefStatus: 'needs_revision',
        draft: {
          chainedDraft: {
            baselineConceptId: 'con-wonka',
            baselineExternalIds: ['exn-joymus'],
            baselineExternalCaptured: true,
            pendingConceptId: 'con-wonderland',
            pendingExternalIds: null,
          },
          editingSection: 'concept',
          editingSectionSnapshot: serverStepData().concept,
          stepDataOverlay: overlay,
          resolvedConflictSections: ['internalNaming'],
        },
      })
    )
    const store = openBrief()
    expect(store.stepData.concept.selectedId).toBe('con-wonka')
    expect(store.editingSection).toBeNull()
    // …but its «resolved» markers are, they live nowhere else
    expect(store.authorRevisionDraft.resolvedConflictSections).toEqual(['internalNaming'])
  })

  it('a section resolved with the Author’s own choice stays resolved after F5', async () => {
    const store = openBrief()
    store.markConflictSectionResolved('concept')
    store.markConflictSectionResolved('externalNaming')
    store.resetAuthorRevisionDraft()
    await vi.advanceTimersByTimeAsync(1000)
    // a second edit of an already resolved section must not wipe them
    store.markConflictSectionResolved('concept')
    store.resetAuthorRevisionDraft()
    await vi.advanceTimersByTimeAsync(1000)

    const reopened = openBrief()
    expect(reopened.authorRevisionDraft.resolvedConflictSections).toEqual(['concept', 'externalNaming'])
  })

  it('F5 on an edit screen opens the review (as a draft edit does, D-05)', () => {
    expect(
      resolveColdStartNavigation({ fromName: undefined, toIsPoEdit: true, toParamsId: ID })
    ).toEqual({ name: 'brand-view-review', params: { id: ID } })
  })
})

describe('leaving an edit by «назад» of the browser (D-12, D-13)', () => {
  it('returned brief, names screen → review: concept and names as they were', () => {
    const store = openBrief()
    revisionConceptChangedAndNext(store)
    store.toggleExternalNaming('exn-wonder-1')

    const action = editFlowLeaveAction({
      fromName: 'po-edit-concept-external-naming',
      fromIsEditScreen: true,
      toName: 'brand-view-review',
      toIsEditScreen: false,
      editingSection: store.editingSection,
    })
    expect(action).toBe('discard')
    store.discardUnfinishedEdit()

    expect(store.stepData.concept.selectedId).toBe('con-wonka')
    expect(store.stepData.externalNaming.selectedIds).toEqual(['exn-joymus'])
    expect(store.editingSection).toBeNull()
  })

  it('returned brief, names screen → concept screen: what «Назад» there does', () => {
    const store = openBrief()
    revisionConceptChangedAndNext(store)
    store.toggleExternalNaming('exn-wonder-1')

    expect(
      editFlowLeaveAction({
        fromName: 'po-edit-concept-external-naming',
        fromIsEditScreen: true,
        toName: 'po-edit-concept',
        toIsEditScreen: true,
        editingSection: store.editingSection,
      })
    ).toBe('step-back')
    store.stepBackToRevisionConcept()

    // the brief is its own again; the picks so far wait for a return
    expect(store.stepData.concept.selectedId).toBe('con-wonka')
    expect(store.stepData.externalNaming.selectedIds).toEqual(['exn-joymus'])
    expect(store.editingSection).toBeNull()
    expect(store.authorRevisionDraft.pendingConceptId).toBe('con-wonderland')
    expect(store.authorRevisionDraft.pendingExternalIds).toEqual(['exn-wonder-1'])
  })

  it('draft, names screen → review («назад» ×2): the old concept with its names', () => {
    const store = openBrief('draft')
    store.beginEditSection('concept', 8)
    store.setConcept({ selectedId: 'con-wonderland', previewId: 'con-wonderland' })
    store.captureCascadeSnapshot('externalNaming')
    store.setExternalNaming({ selectedIds: [], newNamingBrief: null })

    expect(
      editFlowLeaveAction({
        fromName: 'draft-edit-concept',
        fromIsEditScreen: true,
        toName: 'brand-view-review',
        toIsEditScreen: false,
        editingSection: store.editingSection,
      })
    ).toBe('discard')
    store.discardUnfinishedEdit()

    expect(store.stepData.concept.selectedId).toBe('con-wonka')
    expect(store.stepData.externalNaming.selectedIds).toEqual(['exn-joymus'])
  })

  it('saved or cancelled by the buttons, or still inside the edit screens: nothing to do', () => {
    const base = { fromIsEditScreen: true, toIsEditScreen: false, toName: 'brand-view-review' }
    expect(editFlowLeaveAction({ ...base, fromName: 'po-edit-concept', editingSection: null })).toBeNull()
    expect(
      editFlowLeaveAction({
        fromName: 'po-edit-concept',
        fromIsEditScreen: true,
        toName: 'po-edit-concept-external-naming',
        toIsEditScreen: true,
        editingSection: 'concept',
      })
    ).toBeNull()
    expect(
      editFlowLeaveAction({
        fromName: 'brand-view-review',
        fromIsEditScreen: false,
        toName: 'po-edit-concept',
        toIsEditScreen: true,
        editingSection: 'concept',
      })
    ).toBeNull()
  })

  it('the router asks the rule on every navigation', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../../../src/router/index.ts', import.meta.url)),
      'utf8'
    )
    const guard = src.slice(src.indexOf('router.beforeResolve'), src.indexOf('router.beforeEach(async'))
    expect(guard).toContain('editFlowLeaveAction(')
    expect(guard).toContain('store.discardUnfinishedEdit()')
    expect(guard).toContain('store.stepBackToRevisionConcept()')
    expect(src).toContain('toIsPoEdit: to.matched.some(r => r.meta.poEdit === true)')
  })
})
