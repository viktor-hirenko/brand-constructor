import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getAuthHeader } from '@/composables/useApi'
import { migrateIncomingCurrentStep } from '@/utils/stepMigration'
import type {
  BrandStepData,
  BrandBasicsData,
  BrandConceptData,
  BrandExternalNamingData,
  BrandInternalNamingData,
  BrandMarketingPackageData,
  BrandDeliverablesData,
  BrandVisualComponentsData,
  NewConceptBrief,
  NewNamingBrief,
} from '@brand-constructor/shared/types'

const DRAFT_STORAGE_KEY = 'brand-constructor-draft'

function getInitialStepData(): BrandStepData {
  return {
    stepLayoutVersion: 1,
    brandBasics: {
      geo: [],
      launchDate: '',
      linkedProduct: '',
      comment: '',
    },
    mode: 'light',
    concept: {
      selectedId: null,
      previewId: null,
      comment: '',
      newConceptBrief: null,
    },
    externalNaming: {
      selectedIds: [],
      comment: '',
      newNamingBrief: null,
    },
    internalNaming: {
      selectedId: null,
      comment: '',
      newNamingFeedback: null,
    },
    previewComment: '',
    marketingPackage: {
      selectedId: null,
      comment: '',
    },
    deliverables: {
      legalLanding: false,
      partnerLanding: false,
      developmentDeadline: '',
      comment: '',
    },
    visualComponents: {
      selections: {},
      delegateToDesigners: false,
      comment: '',
    },
  }
}

export const useConstructorStore = defineStore('brand-constructor', () => {
  const brandId = ref<string | null>(null)
  const brandInternalName = ref<string | null>(null)
  const brandStatus = ref<string>('draft')
  const brandCeoComments = ref<Record<string, string> | null>(null)
  const brandCeoSelections = ref<Record<string, string> | null>(null)
  const successType = ref<'saved' | 'submitted' | 'needs_revision' | 'approved'>('saved')
  const currentStep = ref(1)
  const stepData = ref<BrandStepData>(getInitialStepData())
  const isDraft = ref(true)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const returnToStep = ref<number | null>(null)
  const step10ScrollTop = ref<number>(0)
  /** Persists across concept preview switches on step 2 (not saved to API). */
  const step3PreviewSlideIndex = ref(0)

  const totalSteps = 9

  const progressPercent = computed(() => {
    return Math.round((currentStep.value / totalSteps) * 100)
  })

  const canGoNext = computed(() => {
    return currentStep.value < totalSteps
  })

  const canGoBack = computed(() => {
    return currentStep.value > 1
  })

  function validateStep(step: number): boolean {
    switch (step) {
      case 1:
        return (
          stepData.value.brandBasics.geo.length > 0 && stepData.value.brandBasics.launchDate !== ''
        )
      case 2:
        return (
          stepData.value.mode !== null &&
          (stepData.value.concept.selectedId !== null ||
            stepData.value.concept.newConceptBrief !== null)
        )
      case 3: {
        const en = stepData.value.externalNaming
        if (en.newNamingBrief !== null) return true
        if (en.selectedIds.length === 0) return false
        if (en.selectedIds.length > 1 && en.comment.trim() === '') return false
        return true
      }
      case 4: {
        const inn = stepData.value.internalNaming
        return (
          inn.selectedId !== null ||
          (inn.newNamingFeedback !== null && inn.newNamingFeedback.trim() !== '')
        )
      }
      case 6:
        return stepData.value.marketingPackage.selectedId !== null
      case 7: {
        const del = stepData.value.deliverables
        const hasAnythingEnabled = del.legalLanding || del.partnerLanding
        if (hasAnythingEnabled && del.developmentDeadline === '') return false
        return true
      }
      case 8: {
        const vc = stepData.value.visualComponents
        if (vc.delegateToDesigners) return true
        const selectionCount = Object.keys(vc.selections).length
        if (selectionCount === 0) return false
        if (hasComponentConflicts.value) return false
        return true
      }
      default:
        return true
    }
  }

  const isCurrentStepValid = computed(() => validateStep(currentStep.value))

  function setBrandBasics(data: Partial<BrandBasicsData>) {
    stepData.value.brandBasics = {
      ...stepData.value.brandBasics,
      ...data,
    }
  }

  function setMode(mode: 'light' | 'dark') {
    stepData.value.mode = mode
  }

  function setConcept(data: Partial<BrandConceptData>) {
    stepData.value.concept = {
      ...stepData.value.concept,
      ...data,
    }
  }

  function setNewConceptBrief(brief: NewConceptBrief | null) {
    stepData.value.concept.newConceptBrief = brief
  }

  const shouldSkipStep3 = computed(() => {
    return stepData.value.concept.newConceptBrief !== null
  })

  function setNewNamingBrief(brief: NewNamingBrief | null) {
    stepData.value.externalNaming.newNamingBrief = brief
  }

  function setExternalNaming(data: Partial<BrandExternalNamingData>) {
    stepData.value.externalNaming = {
      ...stepData.value.externalNaming,
      ...data,
    }
  }

  function toggleExternalNaming(namingId: string) {
    const ids = stepData.value.externalNaming.selectedIds
    const index = ids.indexOf(namingId)

    if (index === -1) {
      if (ids.length < 3) {
        ids.push(namingId)
      }
    } else {
      ids.splice(index, 1)
    }
  }

  function setInternalNaming(data: Partial<BrandInternalNamingData>) {
    stepData.value.internalNaming = {
      ...stepData.value.internalNaming,
      ...data,
    }
  }

  function selectInternalNaming(namingId: string | null) {
    stepData.value.internalNaming.selectedId =
      stepData.value.internalNaming.selectedId === namingId ? null : namingId
  }

  function setInternalNamingFeedback(feedback: string | null) {
    stepData.value.internalNaming.newNamingFeedback = feedback
  }

  function setPreviewComment(comment: string) {
    stepData.value.previewComment = comment
  }

  function setMarketingPackage(data: Partial<BrandMarketingPackageData>) {
    stepData.value.marketingPackage = {
      ...stepData.value.marketingPackage,
      ...data,
    }
  }

  function setDeliverables(data: Partial<BrandDeliverablesData>) {
    const merged = {
      ...stepData.value.deliverables,
      ...data,
    }
    if (!merged.legalLanding && !merged.partnerLanding) {
      merged.developmentDeadline = ''
    }
    stepData.value.deliverables = merged
  }

  function setVisualComponents(data: Partial<BrandVisualComponentsData>) {
    stepData.value.visualComponents = {
      ...stepData.value.visualComponents,
      ...data,
    }
  }

  function setComponentSelection(componentTypeId: string, variantId: string) {
    stepData.value.visualComponents.selections[componentTypeId] = variantId
  }

  function removeComponentSelection(componentTypeId: string) {
    delete stepData.value.visualComponents.selections[componentTypeId]
  }

  function toggleDelegateToDesigners(value: boolean) {
    stepData.value.visualComponents.delegateToDesigners = value
  }

  function resetVisualSelections() {
    stepData.value.visualComponents.selections = {}
  }

  const _componentConflicts = ref<
    Array<{ typeA: string; variantA: string; typeB: string; variantB: string }>
  >([])

  const hasComponentConflicts = computed(() => {
    return _componentConflicts.value.length > 0
  })

  const componentConflicts = computed(() => _componentConflicts.value)

  function setComponentConflicts(
    conflicts: Array<{ typeA: string; variantA: string; typeB: string; variantB: string }>
  ) {
    _componentConflicts.value = conflicts
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= totalSteps) {
      currentStep.value = step
    }
  }

  function nextStep() {
    if (canGoNext.value) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (canGoBack.value) {
      currentStep.value--
    }
  }

  function setBrandStatus(status: string) {
    brandStatus.value = status
  }

  function clearDraftFromStorage() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {}
  }

  function saveDraftToStorage() {
    if (!isDraft.value || brandId.value) return
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          stepData: stepData.value,
          currentStep: currentStep.value,
          savedAt: Date.now(),
        })
      )
    } catch {}
  }

  function restoreDraftFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (parsed.stepData && typeof parsed.currentStep === 'number') {
        const sd = parsed.stepData as BrandStepData
        const layoutV = sd.stepLayoutVersion
        currentStep.value = migrateIncomingCurrentStep(parsed.currentStep, layoutV)
        stepData.value = {
          ...sd,
          stepLayoutVersion: 1,
        }
        return true
      }
    } catch {}
    return false
  }

  watch(stepData, saveDraftToStorage, { deep: true })

  function setReturnToStep(step: number | null) {
    returnToStep.value = step
  }

  function setStep10ScrollTop(value: number) {
    step10ScrollTop.value = value
  }

  function setStep3PreviewSlideIndex(index: number) {
    step3PreviewSlideIndex.value = index
  }

  function reset() {
    brandId.value = null
    brandInternalName.value = null
    brandStatus.value = 'draft'
    brandCeoComments.value = null
    brandCeoSelections.value = null
    currentStep.value = 1
    stepData.value = getInitialStepData()
    isDraft.value = true
    returnToStep.value = null
    step3PreviewSlideIndex.value = 0
    clearDraftFromStorage()
  }

  function loadBrand(
    id: string,
    data: BrandStepData,
    step: number,
    status?: string,
    internalName?: string,
    ceoComments?: Record<string, string> | null,
    ceoSelections?: Record<string, string> | null
  ) {
    brandId.value = id
    brandInternalName.value = internalName ?? null
    brandStatus.value = status ?? 'draft'
    brandCeoComments.value = ceoComments ?? null
    brandCeoSelections.value = ceoSelections ?? null
    const layoutVersion = data.stepLayoutVersion
    const migratedStep = migrateIncomingCurrentStep(step, layoutVersion)
    stepData.value = {
      ...data,
      stepLayoutVersion: layoutVersion ?? 1,
    }
    currentStep.value = migratedStep
    isDraft.value = false
  }

  function setSuccessType(type: 'saved' | 'submitted' | 'needs_revision' | 'approved') {
    successType.value = type
  }

  const saveError = ref<string | null>(null)

  async function saveBrand(): Promise<boolean> {
    isSaving.value = true
    saveError.value = null

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const sd = stepData.value

      const conceptForApi = { ...sd.concept }
      delete (conceptForApi as { previewId?: string | null }).previewId

      const payload = {
        geo: sd.brandBasics.geo.join(','),
        launchDate: sd.brandBasics.launchDate,
        mode: sd.mode,
        conceptId: conceptForApi.selectedId,
        conceptComment: sd.concept.comment,
        externalNamingIds: sd.externalNaming.selectedIds,
        externalNamingComment: sd.externalNaming.comment,
        internalNamingId: sd.internalNaming.selectedId,
        internalNamingComment: sd.internalNaming.comment,
        prPackageId: sd.marketingPackage.selectedId,
        prPackageComment: sd.marketingPackage.comment,
        legalLanding: sd.deliverables.legalLanding,
        partnerLanding: sd.deliverables.partnerLanding,
        deliverablesComment: sd.deliverables.comment,
        componentSelections: sd.visualComponents.selections,
        componentsComment: sd.visualComponents.comment,
        delegateToDesigners: sd.visualComponents.delegateToDesigners,
        newConceptBrief: conceptForApi.newConceptBrief,
        developmentDeadline: sd.deliverables.developmentDeadline || undefined,
        newNamingBrief: sd.externalNaming.newNamingBrief,
        stepData: { ...sd, concept: conceptForApi },
        currentStep: currentStep.value,
      }

      let response: Response

      if (brandId.value) {
        response = await fetch(`${apiUrl}/api/brands/${brandId.value}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch(`${apiUrl}/api/brands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ internalName: null, ...payload }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save brand')
      }

      const result = await response.json()
      if (result.data) {
        if (!brandId.value && result.data.id) {
          brandId.value = result.data.id
          clearDraftFromStorage()
        }
        if (result.data.status) {
          brandStatus.value = result.data.status
        }
        if (result.data.internalName) {
          brandInternalName.value = result.data.internalName
        }
      }

      return true
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : 'An error occurred'
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    brandId,
    brandInternalName,
    brandStatus,
    currentStep,
    stepData,
    isDraft,
    isLoading,
    isSaving,
    totalSteps,
    progressPercent,
    canGoNext,
    canGoBack,
    isCurrentStepValid,
    validateStep,
    setBrandBasics,
    setMode,
    setConcept,
    setNewConceptBrief,
    shouldSkipStep3,
    setNewNamingBrief,
    setExternalNaming,
    toggleExternalNaming,
    setInternalNaming,
    selectInternalNaming,
    setInternalNamingFeedback,
    setPreviewComment,
    setMarketingPackage,
    setDeliverables,
    setVisualComponents,
    setComponentSelection,
    removeComponentSelection,
    toggleDelegateToDesigners,
    resetVisualSelections,
    hasComponentConflicts,
    componentConflicts,
    setComponentConflicts,
    goToStep,
    nextStep,
    prevStep,
    saveBrand,
    saveError,
    setBrandStatus,
    brandCeoComments,
    brandCeoSelections,
    successType,
    setSuccessType,
    returnToStep,
    setReturnToStep,
    step10ScrollTop,
    setStep10ScrollTop,
    step3PreviewSlideIndex,
    setStep3PreviewSlideIndex,
    reset,
    loadBrand,
    restoreDraftFromStorage,
    clearDraftFromStorage,
  }
})
