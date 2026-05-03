import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getAuthHeader, apiPatch } from '@/composables/useApi'
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
  Brand,
} from '@brand-constructor/shared/types'

const DRAFT_STORAGE_KEY = 'brand-constructor-draft'

export type CeoReselectSection = 'concept' | 'externalNaming' | 'internalNaming'

export interface CeoReselectDraft {
  /** Confirmed CEO concept override (null = no override, slider stays on PO concept). */
  conceptId: string | null
  /** What the slider currently shows (independent of confirmation). */
  conceptPreviewId: string | null
  externalNamingIds: string[]
  internalNamingId: string | null
}

export const CEO_RESELECT_EXTERNAL_NAMING_LIMIT = 3

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
  const brandCeoSelections = ref<Record<string, string | string[]> | null>(null)
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

  /** Full-screen overlay concept preview above the right column (CEO / PO). */
  const conceptPreviewOpen = ref(false)
  const conceptPreviewConceptId = ref<string | null>(null)

  /** Transient state for dedicated CEO re-select routes (not persisted until save). */
  const ceoReselectDraft = ref<CeoReselectDraft>({
    conceptId: null,
    conceptPreviewId: null,
    externalNamingIds: [],
    internalNamingId: null,
  })

  const saveCeoSelectionsError = ref<string | null>(null)

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

  /** Opens concept carousel overlay; starts at the first slide (`gallery_url_1`). */
  function openConceptPreview(conceptId: string) {
    conceptPreviewConceptId.value = conceptId
    step3PreviewSlideIndex.value = 0
    conceptPreviewOpen.value = true
  }

  function closeConceptPreview() {
    conceptPreviewOpen.value = false
    conceptPreviewConceptId.value = null
  }

  /**
   * Updates a single CEO comment section locally. Empty string removes the key.
   * Persistence happens later when CEO triggers approve/needs_revision via
   * PATCH /:id/status, which accepts the full `ceoComments` payload.
   */
  function setCeoCommentValue(sectionKey: string, value: string) {
    const trimmed = value.trim()
    const current = brandCeoComments.value ? { ...brandCeoComments.value } : {}
    if (trimmed) {
      current[sectionKey] = trimmed
    } else {
      delete current[sectionKey]
    }
    brandCeoComments.value = Object.keys(current).length > 0 ? current : null
  }

  /**
   * Records CEO-picked alternative for concept/external/internal sections.
   * Empty string clears the override. Same persistence model as comments.
   */
  function setCeoSelectionValue(sectionKey: string, value: string | string[]) {
    const current = brandCeoSelections.value ? { ...brandCeoSelections.value } : {}
    const isEmpty =
      value == null ||
      (typeof value === 'string' && value.length === 0) ||
      (Array.isArray(value) && value.length === 0)
    if (!isEmpty) {
      current[sectionKey] = value
    } else {
      delete current[sectionKey]
    }
    brandCeoSelections.value = Object.keys(current).length > 0 ? current : null
  }

  function resetCeoReselectDraft() {
    ceoReselectDraft.value = {
      conceptId: null,
      conceptPreviewId: null,
      externalNamingIds: [],
      internalNamingId: null,
    }
  }

  /** Confirmed CEO concept override. Pass `null` to clear (= keep PO concept). */
  function setCeoReselectConcept(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptId: id }
  }

  /** Currently previewed concept in slider (independent of confirmation). */
  function setCeoReselectConceptPreview(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptPreviewId: id }
  }

  /** Toggles an external naming id in/out of the staged set, with limit 3. */
  function toggleCeoReselectExternalNaming(id: string): boolean {
    const current = [...ceoReselectDraft.value.externalNamingIds]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= CEO_RESELECT_EXTERNAL_NAMING_LIMIT) return false
      current.push(id)
    }
    ceoReselectDraft.value = { ...ceoReselectDraft.value, externalNamingIds: current }
    return true
  }

  function setCeoReselectExternalNamingIds(ids: string[]) {
    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      externalNamingIds: ids.slice(0, CEO_RESELECT_EXTERNAL_NAMING_LIMIT),
    }
  }

  function setCeoReselectInternalNaming(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, internalNamingId: id }
  }

  function readSelectionAsString(value: string | string[] | undefined): string | null {
    if (typeof value === 'string') return value || null
    if (Array.isArray(value)) return value[0] ?? null
    return null
  }

  function readSelectionAsArray(value: string | string[] | undefined): string[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value) return [value]
    return []
  }

  /**
   * Prefill draft from saved CEO picks, else PO `stepData`, for the given re-select entry point.
   */
  function seedCeoReselectFromBrand(section: CeoReselectSection) {
    const sel = brandCeoSelections.value
    const sd = stepData.value
    resetCeoReselectDraft()
    if (section === 'concept') {
      const ceoConcept = readSelectionAsString(sel?.concept)
      ceoReselectDraft.value.conceptId = ceoConcept
      ceoReselectDraft.value.conceptPreviewId = ceoConcept ?? sd.concept.selectedId
    } else if (section === 'externalNaming') {
      ceoReselectDraft.value.conceptId = readSelectionAsString(sel?.concept) ?? sd.concept.selectedId
      const saved = readSelectionAsArray(sel?.externalNaming)
      ceoReselectDraft.value.externalNamingIds =
        saved.length > 0 ? saved : sd.externalNaming.selectedIds.slice(0, CEO_RESELECT_EXTERNAL_NAMING_LIMIT)
    } else {
      ceoReselectDraft.value.internalNamingId =
        readSelectionAsString(sel?.internalNaming) ?? sd.internalNaming.selectedId ?? null
    }
  }

  /**
   * Preserves `conceptId` in draft (after concept step) and starts external naming pick fresh.
   *
   * In chained mode the CEO has just chosen a different concept, so any prior external
   * naming selections (PO's or previously saved CEO's) belong to the OLD concept and are
   * irrelevant. Starting empty forces the CEO to make a new decision against the new
   * concept's naming set.
   */
  function seedCeoReselectExternalNamingChained() {
    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      externalNamingIds: [],
    }
  }

  /**
   * Merge partial CEO selection keys, persist via PATCH /ceo-selections, update local store from response.
   */
  async function saveCeoSelections(
    partial: Record<string, string | string[] | null | undefined>
  ): Promise<boolean> {
    if (!brandId.value) {
      saveCeoSelectionsError.value = 'No brand id'
      return false
    }
    saveCeoSelectionsError.value = null
    const previous = brandCeoSelections.value ? { ...brandCeoSelections.value } : {}
    const merged: Record<string, string | string[]> = { ...previous }
    for (const [k, v] of Object.entries(partial)) {
      const isEmpty =
        v == null ||
        (typeof v === 'string' && v.length === 0) ||
        (Array.isArray(v) && v.length === 0)
      if (!isEmpty) merged[k] = v as string | string[]
      else delete merged[k]
    }
    const keys = Object.keys(merged)
    const payload = keys.length > 0 ? merged : ({} as Record<string, string | string[]>)

    try {
      const data = await apiPatch<Brand>(`/api/brands/${brandId.value}/ceo-selections`, {
        ceoSelections: payload,
      })
      brandCeoSelections.value =
        data.ceoSelections && Object.keys(data.ceoSelections).length > 0
          ? data.ceoSelections
          : null
      return true
    } catch (error) {
      brandCeoSelections.value = Object.keys(previous).length > 0 ? previous : null
      saveCeoSelectionsError.value =
        error instanceof Error ? error.message : 'Failed to save CEO selections'
      return false
    }
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
    conceptPreviewOpen.value = false
    conceptPreviewConceptId.value = null
    resetCeoReselectDraft()
    saveCeoSelectionsError.value = null
    clearDraftFromStorage()
  }

  function loadBrand(
    id: string,
    data: BrandStepData,
    step: number,
    status?: string,
    internalName?: string,
    ceoComments?: Record<string, string> | null,
    ceoSelections?: Record<string, string | string[]> | null
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
    conceptPreviewOpen,
    conceptPreviewConceptId,
    openConceptPreview,
    closeConceptPreview,
    setCeoCommentValue,
    setCeoSelectionValue,
    ceoReselectDraft,
    resetCeoReselectDraft,
    setCeoReselectConcept,
    setCeoReselectConceptPreview,
    toggleCeoReselectExternalNaming,
    setCeoReselectExternalNamingIds,
    setCeoReselectInternalNaming,
    seedCeoReselectFromBrand,
    seedCeoReselectExternalNamingChained,
    saveCeoSelections,
    saveCeoSelectionsError,
    reset,
    loadBrand,
    restoreDraftFromStorage,
    clearDraftFromStorage,
  }
})
