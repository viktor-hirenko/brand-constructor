import { ref, computed, watch } from 'vue'
import { apiPost, apiPut } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { validateWizardStep } from '@/utils/wizardStepValidation'
import { logSilent } from '@/utils/log'
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
import {
  clearPreviewSlidesDraft,
  readPreviewSlidesDraft,
  writePreviewSlidesDraft,
} from '@/domain/persistence/briefDraftStorage'

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
  const librariesStore = useLibrariesStore()

  // ─── Brand metadata ────────────────────────────────────────────────────────
  const brandId = ref<string | null>(null)
  const brandInternalName = ref<string | null>(null)
  const brandStatus = ref<string>('draft')

  /**
   * Derived from `brandStatus` — maps the server status to the legacy
   * "what just happened" label consumed by `BrandSuccessView`.
   * Read-only: mutations go through `setBrandStatus` only.
   */
  const successType = computed<'saved' | 'submitted' | 'needs_revision' | 'approved'>(() => {
    const s = brandStatus.value
    if (s === 'submitted') return 'submitted'
    if (s === 'needs_revision') return 'needs_revision'
    if (s === 'approved') return 'approved'
    return 'saved'
  })
  const saveError = ref<string | null>(null)

  // ─── Wizard state ──────────────────────────────────────────────────────────
  const currentStep = ref(1)
  const stepData = ref<BrandStepData>(getInitialStepData())
  const isDraft = ref(true)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const returnToStep = ref<number | null>(null)
  /** Persists across concept preview switches (not saved to API). */
  const step3PreviewSlideIndex = ref(0)
  /** F5-safe map: concept id -> last viewed gallery slide index. */
  const previewSlideIndicesByConceptId = ref<Record<string, number>>({})

  const totalSteps = 8

  function clampWizardStep(rawStep: number): number {
    if (!Number.isFinite(rawStep) || rawStep < 1) return 1
    return Math.min(totalSteps, Math.max(1, rawStep))
  }

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
    return validateWizardStep(step, stepData.value, {
      externalNamings: librariesStore.externalNamings,
      hasComponentConflicts: hasComponentConflicts.value,
    })
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

  function setReturnToStep(step: number | null) {
    returnToStep.value = step
  }

  function setStep3PreviewSlideIndex(index: number, conceptId?: string | null) {
    step3PreviewSlideIndex.value = index
    if (!conceptId) return
    previewSlideIndicesByConceptId.value = {
      ...previewSlideIndicesByConceptId.value,
      [conceptId]: index,
    }
    schedulePreviewSlidesPersist()
  }

  function applyPreviewSlideIndexForConcept(
    conceptId: string | null | undefined,
    maxIndex = Number.POSITIVE_INFINITY
  ) {
    if (!conceptId) {
      step3PreviewSlideIndex.value = 0
      return
    }
    const saved = previewSlideIndicesByConceptId.value[conceptId] ?? 0
    const clampedMax = Number.isFinite(maxIndex) ? maxIndex : saved
    step3PreviewSlideIndex.value = Math.min(Math.max(0, saved), Math.max(0, clampedMax))
  }

  function persistPreviewSlidesToStorage() {
    const id = brandId.value
    if (id) {
      writePreviewSlidesDraft(id, previewSlideIndicesByConceptId.value)
      return
    }
    if (!isDraft.value) return
    saveDraftToStorage()
  }

  const schedulePreviewSlidesPersist = debounce(persistPreviewSlidesToStorage, 400)

  function restorePreviewSlidesFromStorage(activeBriefId?: string) {
    try {
      const id = activeBriefId ?? brandId.value
      if (id) {
        const envelope = readPreviewSlidesDraft(id)
        previewSlideIndicesByConceptId.value = envelope?.draft.slideIndicesByConceptId ?? {}
        return
      }
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        previewSlideIndicesByConceptId?: Record<string, number>
      }
      previewSlideIndicesByConceptId.value = parsed.previewSlideIndicesByConceptId ?? {}
    } catch (err) {
      logSilent('restorePreviewSlidesFromStorage', err)
    }
  }

  function clearPreviewSlidesStorage(activeBriefId?: string | null) {
    previewSlideIndicesByConceptId.value = {}
    const id = activeBriefId ?? brandId.value
    if (id) clearPreviewSlidesDraft(id)
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
          previewSlideIndicesByConceptId: previewSlideIndicesByConceptId.value,
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
        currentStep.value = clampWizardStep(parsed.currentStep)
        stepData.value = {
          ...sd,
          stepLayoutVersion: 2,
        }
        previewSlideIndicesByConceptId.value =
          parsed.previewSlideIndicesByConceptId ?? {}
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
    stepData.value = {
      ...data,
      stepLayoutVersion: 2,
    }
    currentStep.value = clampWizardStep(step)
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
    previewSlideIndicesByConceptId.value = {}
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
    // Wizard state
    currentStep,
    stepData,
    isDraft,
    isLoading,
    isSaving,
    returnToStep,
    setReturnToStep,
    step3PreviewSlideIndex,
    previewSlideIndicesByConceptId,
    setStep3PreviewSlideIndex,
    applyPreviewSlideIndexForConcept,
    restorePreviewSlidesFromStorage,
    clearPreviewSlidesStorage,
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
