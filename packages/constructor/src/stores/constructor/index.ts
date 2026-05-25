import { defineStore } from 'pinia'
import type {
  BrandStepData,
  BrandCeoComments,
} from '@brand-constructor/shared/types'
import { useBrandData } from './useBrandData'
import { useSupervisorReview } from './useSupervisorReview'
import { useSupervisorReselectDraft } from './useSupervisorReselectDraft'
import { useAuthorRevisionDraft } from './useAuthorRevisionDraft'
import { usePreviews } from './usePreviews'
import { useInlineSectionEdit } from './useInlineSectionEdit'

export {
  SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT,
  type SupervisorReselectSection,
  type SupervisorReselectDraft,
} from './useSupervisorReselectDraft'

/**
 * The constructor store is a thin Pinia setup-store facade composing five
 * domain-specific composables:
 *
 *  - `useBrandData` — wizard state (Step 1–8), brand metadata, step
 *    validation, navigation, draft localStorage and `saveBrand()`
 *  - `useSupervisorReview` — Supervisor comments + selections,
 *    apply-variant flow (public API keeps the `ceo*` prefix to match the
 *    frontend↔worker contract — see slice header for details)
 *  - `useSupervisorReselectDraft` — transient draft for `/ceo-reselect/*`
 *    routes (Supervisor proposing alternatives to the Author)
 *  - `useAuthorRevisionDraft` — transient draft for `/po-edit/*` chained flow
 *    (Author = Product Owner side of the revision exchange)
 *  - `usePreviews` — concept overlay + PR package drawer
 *  - `useInlineSectionEdit` — Author inline section-edit triggered from Step 10
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
    saveBrand: brandDataPublic.saveBrand,
  })

  const {
    resetSlice: resetSupervisorReselectSlice,
    ...supervisorReselectPublic
  } = useSupervisorReselectDraft({
    stepData: brandDataPublic.stepData,
    brandCeoSelections: supervisorReviewPublic.brandCeoSelections,
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

  // `useAuthorRevisionDraft` needs read-access to the active edit-section so
  // its F5 overlay can capture (and restore) any in-progress inline-edit too.
  const {
    resetSlice: resetAuthorRevisionDraftSlice,
    ...authorRevisionDraftPublic
  } = useAuthorRevisionDraft({
    brandId: brandDataPublic.brandId,
    brandStatus: brandDataPublic.brandStatus,
    stepData: brandDataPublic.stepData,
    editingSection: inlineSectionEditPublic.editingSection,
    editingSectionSnapshot: inlineSectionEditPublic.editingSectionSnapshot,
    restoreEditingSession: inlineSectionEditPublic.restoreEditingSession,
  })

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
    ceoSelections?: Record<string, string | string[]> | null
  ) {
    resetSupervisorReselectSlice()
    resetAuthorRevisionDraftSlice()
    resetPreviewsSlice()
    resetInlineSectionEditSlice()
    loadWizard(id, data, step, status, internalName)
    loadCeo(ceoComments ?? null, ceoSelections ?? null)
  }

  /** Resets every slice to its initial state. Called from `BrandSuccessView` and the create-new-brand flow. */
  function reset() {
    resetBrandDataSlice()
    resetSupervisorReviewSlice()
    resetSupervisorReselectSlice()
    resetAuthorRevisionDraftSlice()
    resetPreviewsSlice()
    resetInlineSectionEditSlice()
  }

  return {
    ...brandDataPublic,
    ...supervisorReviewPublic,
    ...supervisorReselectPublic,
    ...authorRevisionDraftPublic,
    ...previewsPublic,
    ...inlineSectionEditPublic,
    loadBrand,
    reset,
  }
})
