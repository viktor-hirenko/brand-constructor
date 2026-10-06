import { describe, expect, it, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { BrandStepData } from '@brand-constructor/shared/types'
import { useInlineSectionEdit } from '@/stores/constructor/useInlineSectionEdit'

function makeStepData(overrides?: Partial<BrandStepData>): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: [], launchDate: '', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'concept-a', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['ext-1', 'ext-2'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: null, comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
    ...overrides,
  }
}

describe('useInlineSectionEdit', () => {
  let stepData: ReturnType<typeof ref<BrandStepData>>
  let returnToStep: ReturnType<typeof ref<number | null>>
  let sut: ReturnType<typeof useInlineSectionEdit>

  beforeEach(() => {
    stepData = ref(makeStepData())
    returnToStep = ref<number | null>(null)
    sut = useInlineSectionEdit({ stepData, returnToStep })
  })

  describe('beginEditSection / commitEditSection', () => {
    it('captures snapshot and clears on commit', () => {
      sut.beginEditSection('concept', 8)
      expect(sut.editingSection.value).toBe('concept')
      expect(sut.editingSectionSnapshot.value).toEqual({
        selectedId: 'concept-a', previewId: null, comment: '', newConceptBrief: null,
      })

      sut.commitEditSection()
      expect(sut.editingSection.value).toBeNull()
      expect(sut.editingSectionSnapshot.value).toBeNull()
      expect(returnToStep.value).toBeNull()
    })
  })

  describe('cancelEditSection', () => {
    it('restores primary section snapshot', () => {
      sut.beginEditSection('concept', 8)
      stepData.value.concept.selectedId = 'concept-b'

      sut.cancelEditSection()
      expect(stepData.value.concept.selectedId).toBe('concept-a')
    })
  })

  describe('captureCascadeSnapshot', () => {
    it('captures a deep clone of the target section', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')

      expect(sut.cascadeSnapshots.value).toHaveProperty('externalNaming')
      expect(sut.cascadeSnapshots.value.externalNaming).toEqual({
        selectedIds: ['ext-1', 'ext-2'], comment: '', newNamingBrief: null,
      })
    })

    it('snapshot is a deep clone — mutations do not leak', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')

      stepData.value.externalNaming.selectedIds = []
      const snap = sut.cascadeSnapshots.value.externalNaming as { selectedIds: string[] }
      expect(snap.selectedIds).toEqual(['ext-1', 'ext-2'])
    })
  })

  describe('cancelEditSection with cascade snapshots', () => {
    it('restores both primary and cascade sections atomically', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')

      stepData.value.concept.selectedId = 'concept-b'
      stepData.value.externalNaming.selectedIds = []

      sut.cancelEditSection()

      expect(stepData.value.concept.selectedId).toBe('concept-a')
      expect(stepData.value.externalNaming.selectedIds).toEqual(['ext-1', 'ext-2'])
    })

    it('clears cascade snapshots after cancel', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')
      sut.cancelEditSection()

      expect(sut.cascadeSnapshots.value).toEqual({})
    })
  })

  describe('commitEditSection with cascade snapshots', () => {
    it('clears cascade snapshots on commit (does not restore)', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')

      stepData.value.concept.selectedId = 'concept-b'
      stepData.value.externalNaming.selectedIds = ['ext-3']

      sut.commitEditSection()

      expect(stepData.value.concept.selectedId).toBe('concept-b')
      expect(stepData.value.externalNaming.selectedIds).toEqual(['ext-3'])
      expect(sut.cascadeSnapshots.value).toEqual({})
    })
  })

  describe('resetSlice', () => {
    it('clears all state including cascade snapshots', () => {
      sut.beginEditSection('concept', 8)
      sut.captureCascadeSnapshot('externalNaming')

      sut.resetSlice()

      expect(sut.editingSection.value).toBeNull()
      expect(sut.editingSectionSnapshot.value).toBeNull()
      expect(sut.cascadeSnapshots.value).toEqual({})
    })
  })
})

/**
 * A-39 / BD-15 of `docs/design-audit/edit-flow-scenarios.md`: Final review →
 * «Редагувати» Concept → «Темна тема» → «Скасувати» left the brief dark. The
 * theme lives outside the concept slice (`stepData.mode`), so the concept
 * snapshot did not carry it.
 */
describe('«Скасувати» in the concept edit brings the theme back', () => {
  it('cancel restores the theme the brief had when the edit began', () => {
    const stepData = ref(makeStepData({ mode: 'light' }))
    const sut = useInlineSectionEdit({ stepData, returnToStep: ref<number | null>(null) })
    sut.beginEditSection('concept', 8)
    stepData.value.mode = 'dark'
    stepData.value.concept.selectedId = 'concept-dark'

    sut.cancelEditSection()

    expect(stepData.value.mode).toBe('light')
    expect(stepData.value.concept.selectedId).toBe('concept-a')
  })

  it('«Зберегти» keeps the new theme', () => {
    const stepData = ref(makeStepData({ mode: 'light' }))
    const sut = useInlineSectionEdit({ stepData, returnToStep: ref<number | null>(null) })
    sut.beginEditSection('concept', 8)
    stepData.value.mode = 'dark'

    sut.commitEditSection()

    expect(stepData.value.mode).toBe('dark')
  })

  it('cancelling another section does not touch the theme', () => {
    const stepData = ref(makeStepData({ mode: 'light' }))
    const sut = useInlineSectionEdit({ stepData, returnToStep: ref<number | null>(null) })
    sut.beginEditSection('brandBasics', 8)
    stepData.value.mode = 'dark'

    sut.cancelEditSection()

    expect(stepData.value.mode).toBe('dark')
  })
})
