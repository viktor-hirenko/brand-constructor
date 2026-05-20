import { defineStore } from 'pinia'
import type {
  BrandStepData,
  BrandCeoComments,
} from '@brand-constructor/shared/types'
import { useBrandData } from './useBrandData'
import { useCeoReview } from './useCeoReview'
import { useCeoReselectDraft } from './useCeoReselectDraft'
import { usePreviews } from './usePreviews'
import { useEditSection } from './useEditSection'

export {
  CEO_RESELECT_EXTERNAL_NAMING_LIMIT,
  type CeoReselectSection,
  type CeoReselectDraft,
} from './useCeoReselectDraft'

/**
 * The constructor store is a thin Pinia setup-store facade composing five
 * domain-specific composables:
 *
 *  - `useBrandData` — wizard state (Step 1–8), brand metadata, step
 *    validation, navigation, draft localStorage and `saveBrand()`
 *  - `useCeoReview` — CEO comments + selections, apply-variant flow
 *  - `useCeoReselectDraft` — transient draft for `/ceo-reselect/*` routes
 *  - `usePreviews` — concept overlay + PR package drawer
 *  - `useEditSection` — PO inline section-edit triggered from Step 10
 *
 * Cross-slice dependencies are wired through explicit `opts` parameters
 * (refs + callbacks) — there are no module-level import cycles between
 * slices. The facade also owns the two cross-slice orchestrators
 * `loadBrand()` (delegates to per-slice `load*` methods) and `reset()`
 * (delegates to per-slice `resetSlice` methods).
 *
 * The public surface of `useConstructorStore` is preserved byte-for-byte —
 * all existing consumers continue to `import { useConstructorStore } from
 * '@/stores/constructor'`. The legacy `step10ScrollTop` / `setStep10ScrollTop`
 * pair was dropped (unused since F-06 PR #1 removed the scroll-restore
 * mechanism; flagged in F-06 notes as "eligible for cleanup under F-08").
 */
export const useConstructorStore = defineStore('brand-constructor', () => {
  // ─── Compose slices in dependency order ────────────────────────────────────
  const {
    resetSlice: resetBrandDataSlice,
    loadWizard,
    ...brandDataPublic
  } = useBrandData()

  const {
    resetSlice: resetCeoReviewSlice,
    loadCeo,
    ...ceoReviewPublic
  } = useCeoReview({
    stepData: brandDataPublic.stepData,
    brandId: brandDataPublic.brandId,
    saveBrand: brandDataPublic.saveBrand,
  })

  const {
    resetSlice: resetCeoReselectSlice,
    ...ceoReselectPublic
  } = useCeoReselectDraft({
    stepData: brandDataPublic.stepData,
    brandCeoSelections: ceoReviewPublic.brandCeoSelections,
  })

  const {
    resetSlice: resetPreviewsSlice,
    ...previewsPublic
  } = usePreviews({
    step3PreviewSlideIndex: brandDataPublic.step3PreviewSlideIndex,
  })

  const {
    resetSlice: resetEditSectionSlice,
    ...editSectionPublic
  } = useEditSection({
    stepData: brandDataPublic.stepData,
    returnToStep: brandDataPublic.returnToStep,
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
    loadWizard(id, data, step, status, internalName)
    loadCeo(ceoComments ?? null, ceoSelections ?? null)
  }

  /** Resets every slice to its initial state. Called from `BrandSuccessView` and the create-new-brand flow. */
  function reset() {
    resetBrandDataSlice()
    resetCeoReviewSlice()
    resetCeoReselectSlice()
    resetPreviewsSlice()
    resetEditSectionSlice()
  }

  return {
    ...brandDataPublic,
    ...ceoReviewPublic,
    ...ceoReselectPublic,
    ...previewsPublic,
    ...editSectionPublic,
    loadBrand,
    reset,
  }
})
