import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logSilent } from '@/utils/log'

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
import { apiPatch, apiPost, apiPut } from '@/composables/useApi'
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
  CeoCommentMeta,
  NewConceptBrief,
  NewNamingBrief,
  Brand,
  PrPackage,
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

export const useConstructorStore = defineStore('brand-constructor', () => {
  const brandId = ref<string | null>(null)
  const brandInternalName = ref<string | null>(null)
  const brandStatus = ref<string>('draft')
  const brandCeoComments = ref<BrandCeoComments | null>(null)
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

  /** Right-side drawer PR package preview (PO final review). */
  const prPackagePreviewOpen = ref(false)
  const prPackagePreviewPackage = ref<PrPackage | null>(null)

  /**
   * Section-edit mode from PO Final review.
   * When set, steps render “Скасувати / Зберегти” footer instead of Назад/Далі
   * or the generic “Повернутись”. Snapshot is restored on Скасувати.
   */
  const editingSection = ref<string | null>(null)
  const editingSectionSnapshot = ref<unknown>(null)

  /** Transient state for dedicated CEO re-select routes (not persisted until save). */
  const ceoReselectDraft = ref<CeoReselectDraft>({
    conceptId: null,
    conceptPreviewId: null,
    externalNamingIds: [],
    internalNamingId: null,
  })

  const saveCeoSelectionsError = ref<string | null>(null)

  const totalSteps = 8

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

  function openPrPackagePreview(pkg: PrPackage) {
    prPackagePreviewPackage.value = pkg
    prPackagePreviewOpen.value = true
  }

  function closePrPackagePreview() {
    prPackagePreviewOpen.value = false
    prPackagePreviewPackage.value = null
  }

  /** Maps a Review section key to the matching slice of stepData. */
  function getSectionStateByKey(key: string): unknown {
    switch (key) {
      case 'basics':
        return stepData.value.brandBasics
      case 'concept':
        return stepData.value.concept
      case 'externalNaming':
        return stepData.value.externalNaming
      case 'internalNaming':
        return stepData.value.internalNaming
      case 'marketingPackage':
        return stepData.value.marketingPackage
      case 'deliverables':
        return stepData.value.deliverables
      case 'visualComponents':
        return stepData.value.visualComponents
      default:
        return null
    }
  }

  function restoreSectionStateByKey(key: string, value: unknown) {
    if (value == null) return
    switch (key) {
      case 'basics':
        stepData.value.brandBasics = value as BrandBasicsData
        break
      case 'concept':
        stepData.value.concept = value as BrandConceptData
        break
      case 'externalNaming':
        stepData.value.externalNaming = value as BrandExternalNamingData
        break
      case 'internalNaming':
        stepData.value.internalNaming = value as BrandInternalNamingData
        break
      case 'marketingPackage':
        stepData.value.marketingPackage = value as BrandMarketingPackageData
        break
      case 'deliverables':
        stepData.value.deliverables = value as BrandDeliverablesData
        break
      case 'visualComponents':
        stepData.value.visualComponents = value as BrandVisualComponentsData
        break
    }
  }

  /**
   * Begin inline edit of a single review section. Captures a deep snapshot so
   * Скасувати can restore untouched state; sets `returnToStep` so the layout
   * knows where to come back.
   */
  function beginEditSection(key: string, fromStep: number) {
    const snapshot = getSectionStateByKey(key)
    editingSection.value = key
    editingSectionSnapshot.value =
      snapshot == null ? null : JSON.parse(JSON.stringify(snapshot))
    returnToStep.value = fromStep
  }

  /** Commit the current edits and clear the edit flag. */
  function commitEditSection() {
    editingSection.value = null
    editingSectionSnapshot.value = null
    returnToStep.value = null
  }

  /** Revert the section to its snapshot and clear the edit flag. */
  function cancelEditSection() {
    const key = editingSection.value
    if (key) {
      restoreSectionStateByKey(key, editingSectionSnapshot.value)
    }
    editingSection.value = null
    editingSectionSnapshot.value = null
    returnToStep.value = null
  }

  /**
   * Updates a single CEO comment section locally. Empty string removes the key.
   * Persistence happens later when CEO triggers approve/needs_revision via
   * PATCH /:id/status, which accepts the full `ceoComments` payload.
   *
   * The stored shape is `CeoCommentMeta` (`value` + `resolved` + `resolvedAt`).
   * Setting a new value resets `resolved` to `false` — re-editing a comment
   * implicitly invalidates a previous resolve.
   */
  function setCeoCommentValue(sectionKey: string, value: string) {
    const trimmed = value.trim()
    const current: BrandCeoComments = brandCeoComments.value
      ? { ...brandCeoComments.value }
      : {}
    if (trimmed) {
      const prev = current[sectionKey]
      const sameText = prev?.value === trimmed
      current[sectionKey] = {
        value: trimmed,
        resolved: sameText ? prev.resolved : false,
        resolvedAt: sameText ? prev.resolvedAt : null,
      }
    } else {
      delete current[sectionKey]
    }
    brandCeoComments.value = Object.keys(current).length > 0 ? current : null
  }

  const saveCeoCommentResolvedError = ref<string | null>(null)
  const saveCeoCommentResolvedLoading = ref<Set<string>>(new Set())

  /**
   * Persists resolve/unresolve of a CEO comment for a single section.
   * Uses optimistic update with rollback on failure.
   *
   * Allowed only for the brand owner (worker enforces) and only while the
   * brand is in `needs_revision`. Concurrent calls for the same section are
   * blocked via `saveCeoCommentResolvedLoading`.
   */
  async function setCeoCommentResolved(sectionKey: string, resolved: boolean): Promise<boolean> {
    if (!brandId.value) {
      saveCeoCommentResolvedError.value = 'No brand id'
      return false
    }
    if (saveCeoCommentResolvedLoading.value.has(sectionKey)) {
      return false
    }
    const current = brandCeoComments.value
    const existing = current?.[sectionKey]
    if (!existing) {
      saveCeoCommentResolvedError.value = `No CEO comment for section "${sectionKey}"`
      return false
    }

    saveCeoCommentResolvedError.value = null
    saveCeoCommentResolvedLoading.value = new Set([
      ...saveCeoCommentResolvedLoading.value,
      sectionKey,
    ])

    const optimistic: CeoCommentMeta = {
      value: existing.value,
      resolved,
      resolvedAt: resolved ? new Date().toISOString() : null,
    }
    const prevSnapshot: BrandCeoComments | null = current ? { ...current } : null
    brandCeoComments.value = { ...current, [sectionKey]: optimistic }

    try {
      const data = await apiPatch<Brand>(
        `/api/brands/${brandId.value}/ceo-comments/resolve`,
        { section: sectionKey, resolved }
      )
      brandCeoComments.value = data.ceoComments ?? null
      return true
    } catch (error) {
      brandCeoComments.value = prevSnapshot
      saveCeoCommentResolvedError.value =
        error instanceof Error ? error.message : 'Failed to update CEO comment'
      return false
    } finally {
      const next = new Set(saveCeoCommentResolvedLoading.value)
      next.delete(sectionKey)
      saveCeoCommentResolvedLoading.value = next
    }
  }

  function isCeoCommentResolveLoading(sectionKey: string): boolean {
    return saveCeoCommentResolvedLoading.value.has(sectionKey)
  }

  const isApplyingCeoVariant = ref(false)
  const applyCeoVariantError = ref<string | null>(null)

  /**
   * Applies CEO's suggested alternative for a single section to PO's stepData,
   * then persists via saveBrand().
   *
   * `concept` — overwrites stepData.concept.selectedId and clears externalNaming
   *   selectedIds (they belonged to the old concept and are now invalid).
   * `externalNaming` — overwrites stepData.externalNaming.selectedIds.
   *   ⚠️  Caller must first check hasConceptMismatch: if CEO also suggests a
   *   different concept that hasn't been applied yet, show the modal instead of
   *   calling this directly.
   * `internalNaming` — overwrites stepData.internalNaming.selectedId.
   */
  async function applyCeoVariant(
    section: 'concept' | 'externalNaming' | 'internalNaming'
  ): Promise<boolean> {
    if (!brandId.value) return false
    isApplyingCeoVariant.value = true
    applyCeoVariantError.value = null
    try {
      const sel = brandCeoSelections.value
      if (section === 'concept') {
        const ceoConcept = readSelectionAsString(sel?.concept)
        if (!ceoConcept) return false
        stepData.value.concept.selectedId = ceoConcept
        stepData.value.concept.newConceptBrief = null
        // External namings belong to the old concept — clear them.
        stepData.value.externalNaming.selectedIds = []
        stepData.value.externalNaming.newNamingBrief = null
      } else if (section === 'externalNaming') {
        const ceoExt = readSelectionAsArray(sel?.externalNaming)
        if (ceoExt.length === 0) return false
        stepData.value.externalNaming.selectedIds = ceoExt.slice(0, 3)
        stepData.value.externalNaming.newNamingBrief = null
      } else {
        const ceoInt = readSelectionAsString(sel?.internalNaming)
        if (!ceoInt) return false
        stepData.value.internalNaming.selectedId = ceoInt
        stepData.value.internalNaming.newNamingFeedback = null
      }
      return await saveBrand()
    } catch (error) {
      applyCeoVariantError.value =
        error instanceof Error ? error.message : 'Failed to apply CEO variant'
      return false
    } finally {
      isApplyingCeoVariant.value = false
    }
  }

  /**
   * Atomically applies both CEO concept AND external naming in one saveBrand()
   * call. Used by the "Застосувати все" button in the dependency-guard modal.
   */
  async function applyCeoConceptAndExternal(): Promise<boolean> {
    if (!brandId.value) return false
    isApplyingCeoVariant.value = true
    applyCeoVariantError.value = null
    try {
      const sel = brandCeoSelections.value
      const ceoConcept = readSelectionAsString(sel?.concept)
      const ceoExt = readSelectionAsArray(sel?.externalNaming)
      if (!ceoConcept) return false
      stepData.value.concept.selectedId = ceoConcept
      stepData.value.concept.newConceptBrief = null
      if (ceoExt.length > 0) {
        stepData.value.externalNaming.selectedIds = ceoExt.slice(0, 3)
        stepData.value.externalNaming.newNamingBrief = null
      } else {
        stepData.value.externalNaming.selectedIds = []
        stepData.value.externalNaming.newNamingBrief = null
      }
      return await saveBrand()
    } catch (error) {
      applyCeoVariantError.value =
        error instanceof Error ? error.message : 'Failed to apply CEO variants'
      return false
    } finally {
      isApplyingCeoVariant.value = false
    }
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
    prPackagePreviewOpen.value = false
    prPackagePreviewPackage.value = null
    editingSection.value = null
    editingSectionSnapshot.value = null
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
    ceoComments?: BrandCeoComments | null,
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
      stepLayoutVersion: 2,
    }
    currentStep.value = migratedStep
    isDraft.value = false
  }

  function setSuccessType(type: 'saved' | 'submitted' | 'needs_revision' | 'approved') {
    successType.value = type
  }

  const saveError = ref<string | null>(null)

  interface SaveBrandResult {
    id?: string
    status?: string
    internalName?: string | null
  }

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
    prPackagePreviewOpen,
    prPackagePreviewPackage,
    openPrPackagePreview,
    closePrPackagePreview,
    editingSection,
    beginEditSection,
    commitEditSection,
    cancelEditSection,
    setCeoCommentValue,
    setCeoCommentResolved,
    isCeoCommentResolveLoading,
    saveCeoCommentResolvedError,
    applyCeoVariant,
    applyCeoConceptAndExternal,
    isApplyingCeoVariant,
    applyCeoVariantError,
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
