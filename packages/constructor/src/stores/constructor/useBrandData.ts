import { ref, computed, watch } from 'vue'
import { apiPost, apiPut } from '@/composables/useApi'
import { logSilent } from '@/utils/log'
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
  BrandCeoComments,
  NewConceptBrief,
  NewNamingBrief,
} from '@brand-constructor/shared/types'

const DRAFT_STORAGE_KEY = 'brand-constructor-draft'

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

function getInitialStepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
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

interface SaveBrandResult {
  id?: string
  status?: string
  internalName?: string | null
}

/**
 * Wizard state + brand metadata + persistence slice of the constructor store.
 *
 * Owns:
 *  - the entire `stepData` shape that mirrors the 8-step wizard
 *  - brand identity / status / internal name + `successType` (post-action
 *    redirect cue used by `BrandSuccessView`)
 *  - step navigation (`goToStep`, `nextStep`, `prevStep`) + `validateStep`
 *  - draft localStorage persistence (debounced watch on `stepData`)
 *  - `saveBrand()` — POST on first call (captures the new id), PUT thereafter
 *  - the visual-components conflict registry (Step 7 / Step 9 conflict modal)
 *
 * Exposes `loadWizard` and `resetSlice` for the facade to orchestrate
 * cross-slice `loadBrand` / `reset` actions.
 */
export function useBrandData() {
  // ─── Brand metadata ────────────────────────────────────────────────────────
  const brandId = ref<string | null>(null)
  const brandInternalName = ref<string | null>(null)
  const brandStatus = ref<string>('draft')
  const successType = ref<'saved' | 'submitted' | 'needs_revision' | 'approved'>('saved')
  const saveError = ref<string | null>(null)

  // ─── Wizard state ──────────────────────────────────────────────────────────
  const currentStep = ref(1)
  const stepData = ref<BrandStepData>(getInitialStepData())
  const isDraft = ref(true)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const returnToStep = ref<number | null>(null)
  /** Persists across concept preview switches on step 2 (not saved to API). */
  const step3PreviewSlideIndex = ref(0)

  const totalSteps = 8

  // ─── Component conflicts (Step 7 visual-components dependency check) ───────
  const _componentConflicts = ref<
    Array<{ typeA: string; variantA: string; typeB: string; variantB: string }>
  >([])

  const hasComponentConflicts = computed(() => _componentConflicts.value.length > 0)
  const componentConflicts = computed(() => _componentConflicts.value)

  function setComponentConflicts(
    conflicts: Array<{ typeA: string; variantA: string; typeB: string; variantB: string }>
  ) {
    _componentConflicts.value = conflicts
  }

  // ─── Computed navigation flags ─────────────────────────────────────────────
  const progressPercent = computed(() => Math.round((currentStep.value / totalSteps) * 100))
  const canGoNext = computed(() => currentStep.value < totalSteps)
  const canGoBack = computed(() => currentStep.value > 1)

  const shouldSkipStep3 = computed(() => stepData.value.concept.newConceptBrief !== null)

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
      case 5:
        return stepData.value.marketingPackage.selectedId !== null
      case 6: {
        const del = stepData.value.deliverables
        const hasAnythingEnabled = del.legalLanding || del.partnerLanding
        if (hasAnythingEnabled && del.developmentDeadline === '') return false
        return true
      }
      case 7: {
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

  // ─── Step-data mutators ────────────────────────────────────────────────────
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
      if (ids.length < 3) ids.push(namingId)
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

  // ─── Navigation ────────────────────────────────────────────────────────────
  function goToStep(step: number) {
    if (step >= 1 && step <= totalSteps) {
      currentStep.value = step
    }
  }

  function nextStep() {
    if (canGoNext.value) currentStep.value++
  }

  function prevStep() {
    if (canGoBack.value) currentStep.value--
  }

  function setBrandStatus(status: string) {
    brandStatus.value = status
  }

  function setSuccessType(type: 'saved' | 'submitted' | 'needs_revision' | 'approved') {
    successType.value = type
  }

  function setReturnToStep(step: number | null) {
    returnToStep.value = step
  }

  function setStep3PreviewSlideIndex(index: number) {
    step3PreviewSlideIndex.value = index
  }

  // ─── Draft localStorage ────────────────────────────────────────────────────
  function clearDraftFromStorage() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (err) {
      logSilent('clearDraftFromStorage', err)
    }
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
    } catch (err) {
      logSilent('saveDraftToStorage', err)
    }
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
          stepLayoutVersion: 2,
        }
        return true
      }
    } catch (err) {
      logSilent('restoreDraftFromStorage', err)
    }
    return false
  }

  const saveDraftToStorageDebounced = debounce(saveDraftToStorage, 500)
  watch(stepData, saveDraftToStorageDebounced, { deep: true })
  watch(currentStep, saveDraftToStorageDebounced)

  // ─── Persistence ───────────────────────────────────────────────────────────
  async function saveBrand(): Promise<boolean> {
    isSaving.value = true
    saveError.value = null

    try {
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

      let result: SaveBrandResult

      if (brandId.value) {
        result = await apiPut<SaveBrandResult>(`/api/brands/${brandId.value}`, payload)
      } else {
        result = await apiPost<SaveBrandResult>('/api/brands', { internalName: null, ...payload })
        if (result.id) {
          brandId.value = result.id
          clearDraftFromStorage()
        }
      }

      if (result.status) brandStatus.value = result.status
      if (result.internalName) brandInternalName.value = result.internalName

      return true
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : 'An error occurred'
      return false
    } finally {
      isSaving.value = false
    }
  }

  // ─── Facade-orchestrated load + reset ──────────────────────────────────────

  /**
   * Hydrates wizard + meta state for an existing brand. CEO comments and CEO
   * selections live in `useCeoReview` — the facade calls both loaders in
   * sequence from its `loadBrand` orchestrator.
   */
  function loadWizard(
    id: string,
    data: BrandStepData,
    step: number,
    status?: string,
    internalName?: string
  ) {
    brandId.value = id
    brandInternalName.value = internalName ?? null
    brandStatus.value = status ?? 'draft'
    const layoutVersion = data.stepLayoutVersion
    const migratedStep = migrateIncomingCurrentStep(step, layoutVersion)
    stepData.value = {
      ...data,
      stepLayoutVersion: 2,
    }
    currentStep.value = migratedStep
    isDraft.value = false
  }

  function resetSlice() {
    brandId.value = null
    brandInternalName.value = null
    brandStatus.value = 'draft'
    currentStep.value = 1
    stepData.value = getInitialStepData()
    isDraft.value = true
    returnToStep.value = null
    step3PreviewSlideIndex.value = 0
    clearDraftFromStorage()
  }

  return {
    // Brand metadata
    brandId,
    brandInternalName,
    brandStatus,
    successType,
    saveError,
    setBrandStatus,
    setSuccessType,
    // Wizard state
    currentStep,
    stepData,
    isDraft,
    isLoading,
    isSaving,
    returnToStep,
    setReturnToStep,
    step3PreviewSlideIndex,
    setStep3PreviewSlideIndex,
    totalSteps,
    // Computed
    progressPercent,
    canGoNext,
    canGoBack,
    isCurrentStepValid,
    shouldSkipStep3,
    hasComponentConflicts,
    componentConflicts,
    // Validation
    validateStep,
    // Step mutators
    setBrandBasics,
    setMode,
    setConcept,
    setNewConceptBrief,
    setNewNamingBrief,
    setExternalNaming,
    toggleExternalNaming,
    setInternalNaming,
    selectInternalNaming,
    setInternalNamingFeedback,
    setMarketingPackage,
    setDeliverables,
    setVisualComponents,
    setComponentSelection,
    removeComponentSelection,
    toggleDelegateToDesigners,
    resetVisualSelections,
    setComponentConflicts,
    // Navigation
    goToStep,
    nextStep,
    prevStep,
    // Persistence
    saveBrand,
    // Draft storage
    restoreDraftFromStorage,
    clearDraftFromStorage,
    // Facade-internal (orchestrated by index.ts)
    loadWizard,
    resetSlice,
  }
}

export type UseBrandDataReturn = ReturnType<typeof useBrandData>
