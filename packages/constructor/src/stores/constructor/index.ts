import { defineStore } from 'pinia'
import type {
  BrandStepData,
  BrandCeoComments,
} from '@brand-constructor/shared/types'
import { useBrandData } from './useBrandData'
import { useSupervisorReview } from './useSupervisorReview'
import { forgetOwnVariant, keepOwnVariant } from '@/utils/revisionKeptOwn'
import { useSupervisorAlternativeDraft } from './useSupervisorAlternativeDraft'
import { useAuthorRevisionDraft } from './useAuthorRevisionDraft'
import { usePreviews } from './usePreviews'
import { useInlineSectionEdit } from './useInlineSectionEdit'
import { useWizardDraftCopy } from './useWizardDraftCopy'
import { externalIdsOnConceptCancel } from '@/utils/revisionConceptCancel'

export {
  SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT,
  type SupervisorAlternativeSection,
  type SupervisorAlternativeDraft,
} from './useSupervisorAlternativeDraft'

/**
 * The constructor store is a thin Pinia setup-store facade composing five
 * domain-specific composables:
 *
 *  - `useBrandData` — wizard state (Step 1–8), brand metadata, step
 *    validation, navigation, draft localStorage and `saveBrand()`
 *  - `useSupervisorReview` — Supervisor comments + selections,
 *    apply-variant flow (public API keeps the `ceo*` prefix to match the
 *    frontend↔worker contract — see slice header for details)
 *  - `useSupervisorAlternativeDraft` — transient draft for `/ceo-reselect/*`
 *    routes (Supervisor proposing alternatives to the Author; URL fragment
 *    kept for backward-compat)
 *  - `useAuthorRevisionDraft` — transient draft for `/po-edit/*` chained flow
 *    (Author = Product Owner side of the revision exchange)
 *  - `usePreviews` — concept overlay + PR package drawer
 *  - `useInlineSectionEdit` — Author inline section-edit triggered from Step 10
 *  - `useWizardDraftCopy` — browser copy of a draft's unsaved answers
 *
 * Cross-slice dependencies are wired through explicit `opts` parameters
 * (refs + callbacks) — there are no module-level import cycles between
 * slices. The facade also owns the two cross-slice orchestrators
 * `loadBrand()` (delegates to per-slice `load*` methods) and `reset()`
 * (delegates to per-slice `resetSlice` methods).
 *
 * The public surface of `useConstructorStore` is preserved across the
 * facade — all existing consumers continue to
 * `import { useConstructorStore } from '@/stores/constructor'`.
 */
export const useConstructorStore = defineStore('brand-constructor', () => {
  // ─── Compose slices in dependency order ────────────────────────────────────
  const {
    resetSlice: resetBrandDataSlice,
    loadWizard,
    ...brandDataPublic
  } = useBrandData()

  const {
    resetSlice: resetSupervisorReviewSlice,
    loadCeo,
    ...supervisorReviewPublic
  } = useSupervisorReview({
    stepData: brandDataPublic.stepData,
    brandId: brandDataPublic.brandId,
    brandStatus: brandDataPublic.brandStatus,
    serverUpdatedAt: brandDataPublic.serverUpdatedAt,
    saveBrand: brandDataPublic.saveBrand,
  })

  const {
    resetSlice: resetSupervisorAlternativeSlice,
    ...supervisorAlternativePublic
  } = useSupervisorAlternativeDraft({
    stepData: brandDataPublic.stepData,
    brandSupervisorSelections: supervisorReviewPublic.brandCeoSelections,
    brandId: brandDataPublic.brandId,
  })

  const {
    resetSlice: resetPreviewsSlice,
    ...previewsPublic
  } = usePreviews({
    step3PreviewSlideIndex: brandDataPublic.step3PreviewSlideIndex,
  })

  const {
    resetSlice: resetInlineSectionEditSlice,
    ...inlineSectionEditPublic
  } = useInlineSectionEdit({
    stepData: brandDataPublic.stepData,
    returnToStep: brandDataPublic.returnToStep,
  })

  const {
    resetSlice: resetAuthorRevisionDraftSlice,
    ...authorRevisionDraftPublic
  } = useAuthorRevisionDraft({
    brandId: brandDataPublic.brandId,
    brandStatus: brandDataPublic.brandStatus,
  })

  const {
    resetSlice: resetWizardDraftCopySlice,
    flushWizardDraftCopy,
    markWizardDraftSaved,
    ...wizardDraftCopyPublic
  } = useWizardDraftCopy({
    brandId: brandDataPublic.brandId,
    brandStatus: brandDataPublic.brandStatus,
    stepData: brandDataPublic.stepData,
    editingSection: inlineSectionEditPublic.editingSection,
  })

  /**
   * `saveBrand()` with the draft copy kept in step: what is being sent is
   * written to the browser first (so a save that dies on an expired session
   * is not lost), and dropped once the server has it.
   */
  async function saveBrand(): Promise<boolean> {
    flushWizardDraftCopy()
    const saved = await brandDataPublic.saveBrand()
    if (saved) markWizardDraftSaved(brandDataPublic.serverUpdatedAt.value)
    return saved
  }

  // ─── Leaving an edit screen without saving ────────────────────────────────

  /**
   * Drops the edit the Author opened from the review and did not save — what
   * «Скасувати» does on every edit screen, and what leaving one any other way
   * («назад» of the browser, a link to the review) does too, so the review
   * never shows a half-done edit as the brief (H-03, H-02; run 02.10: D-12,
   * D-13). Revision: the External Naming the chained concept → names flow
   * cleared comes back from its baseline. Draft: `cancelEditSection` brings
   * back both the concept and the cascaded names.
   */
  function discardUnfinishedEdit() {
    const restoreIds = externalIdsOnConceptCancel(authorRevisionDraftPublic.authorRevisionDraft.value)
    if (restoreIds) {
      brandDataPublic.setExternalNaming({ selectedIds: restoreIds, newNamingBrief: null })
    }
    authorRevisionDraftPublic.resetAuthorRevisionDraft()
    inlineSectionEditPublic.cancelEditSection()
  }

  /**
   * Revision, names screen after a concept change → back to the concept
   * screen («Назад» there, or the browser's): the names picked so far are kept
   * aside for a return, the brief gets its own concept and names back, and the
   * concept screen opens a fresh edit over them.
   */
  function stepBackToRevisionConcept() {
    authorRevisionDraftPublic.setAuthorRevisionPendingExternal(
      brandDataPublic.stepData.value.externalNaming.selectedIds ?? []
    )
    brandDataPublic.setExternalNaming({
      selectedIds: [...authorRevisionDraftPublic.authorRevisionDraft.value.baselineExternalIds],
      newNamingBrief: null,
    })
    inlineSectionEditPublic.cancelEditSection()
  }

  // ─── Cross-slice orchestrators ─────────────────────────────────────────────

  /**
   * Hydrates the entire store from a brand row fetched from the worker.
   * Wizard + meta come from `useBrandData.loadWizard`; CEO comments +
   * selections come from `useCeoReview.loadCeo`. Other slices stay at their
   * initial values — they are transient UI state.
   */
  function loadBrand(
    id: string,
    data: BrandStepData,
    step: number,
    status?: string,
    internalName?: string,
    ceoComments?: BrandCeoComments | null,
    ceoSelections?: Record<string, string | string[]> | null,
    ordersReadyAt?: string | null,
    updatedAt?: string
  ) {
    resetSupervisorAlternativeSlice()
    resetAuthorRevisionDraftSlice()
    resetPreviewsSlice()
    resetInlineSectionEditSlice()
    loadWizard(id, data, step, status, internalName, ordersReadyAt, updatedAt)
    loadCeo(ceoComments ?? null, ceoSelections ?? null)
  }

  /** Resets every slice to its initial state. Called from `BrandSuccessView` and the create-new-brand flow. */
  function reset() {
    resetBrandDataSlice()
    resetWizardDraftCopySlice()
    resetSupervisorReviewSlice()
    resetSupervisorAlternativeSlice()
    resetAuthorRevisionDraftSlice()
    resetPreviewsSlice()
    resetInlineSectionEditSlice()
  }

  /**
   * «Свій варіант»: the section is answered with the author's own choice. The
   * mark goes into the brief's step data too, so the next save carries it to
   * the server (D-33, E-27) — the browser list alone lasted 24 hours.
   */
  function markConflictSectionResolved(section: string) {
    authorRevisionDraftPublic.markConflictSectionResolved(section)
    keepOwnVariant(brandDataPublic.stepData.value, section, supervisorReviewPublic.brandCeoSelections.value)
  }

  /** A save that failed takes its marks back: the brief kept its old choice. */
  function unmarkConflictSections(sections: string[]) {
    const draft = authorRevisionDraftPublic.authorRevisionDraft.value
    draft.resolvedConflictSections = draft.resolvedConflictSections.filter(s => !sections.includes(s))
    forgetOwnVariant(brandDataPublic.stepData.value, sections)
  }

  return {
    ...brandDataPublic,
    ...supervisorReviewPublic,
    ...supervisorAlternativePublic,
    ...authorRevisionDraftPublic,
    markConflictSectionResolved,
    unmarkConflictSections,
    ...previewsPublic,
    ...inlineSectionEditPublic,
    ...wizardDraftCopyPublic,
    saveBrand,
    discardUnfinishedEdit,
    stepBackToRevisionConcept,
    loadBrand,
    reset,
  }
})
