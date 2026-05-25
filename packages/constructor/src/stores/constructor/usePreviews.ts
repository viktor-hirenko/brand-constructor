import { computed, ref, type Ref } from 'vue'
import type { PrPackage } from '@brand-constructor/shared/types'

export type BriefPreviewKind = 'concept' | 'externalNaming' | 'internalNaming'

interface UsePreviewsOptions {
  /**
   * Concept-slider slide index from `useBrandData`. Reset to 0 when a new
   * concept preview opens so the carousel always lands on `gallery_url_1`.
   */
  step3PreviewSlideIndex: Ref<number>
}

/**
 * Preview overlay state (right-side drawer + centered modal).
 *
 * Owns:
 *  - `conceptPreviewOpen` / `conceptPreviewConceptId` — right-side drawer
 *    concept-gallery slider above the right column (CEO + PO Step 10 review)
 *  - `prPackagePreviewOpen` / `prPackagePreviewPackage` — centered modal PR
 *    package preview (PO final review)
 *  - `briefPreviewKind` — centered read-only brief modal reusing `New*Modal`
 *    (Steps 2/4/5 dropdown + Step 6 review)
 *  - `briefPreviewEditRequested` — pending edit signal raised when the user
 *    clicks «Редагувати» in the read-only brief modal; consumed by the wizard
 *    view to open its own editable modal.
 *
 * Cross-slice dep: `openConceptPreview` resets `step3PreviewSlideIndex` (owned
 * by `useBrandData`) to keep the slider behaviour unchanged when a new
 * preview opens.
 */
export function usePreviews(opts: UsePreviewsOptions) {
  const { step3PreviewSlideIndex } = opts

  /** Right-side drawer concept-gallery preview (CEO / PO). */
  const conceptPreviewOpen = ref(false)
  const conceptPreviewConceptId = ref<string | null>(null)

  /** Centered modal PR package preview (PO final review). */
  const prPackagePreviewOpen = ref(false)
  const prPackagePreviewPackage = ref<PrPackage | null>(null)

  /** Centered read-only brief preview (Steps 2/4/5 dropdown + Step 6 review). */
  const briefPreviewKind = ref<BriefPreviewKind | null>(null)
  const briefPreviewOpen = computed(() => briefPreviewKind.value !== null)

  /**
   * Controls whether the read-only brief modal shows the «Редагувати»
   * primary action. Wizard steps (where the user owns the editable form)
   * pass `true`; the review step passes `false` because it has its own
   * section-edit flow.
   */
  const briefPreviewAllowEdit = ref(true)

  /**
   * Pending edit request raised from the read-only brief modal. Wizard views
   * (`ConceptSelectionView` / `External…` / `Internal…`) watch this ref and
   * open their own editable modal, then call `consumeBriefPreviewEditRequest`.
   */
  const briefPreviewEditRequested = ref<BriefPreviewKind | null>(null)

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

  function openBriefPreview(
    kind: BriefPreviewKind,
    options?: { allowEdit?: boolean },
  ) {
    briefPreviewKind.value = kind
    briefPreviewAllowEdit.value = options?.allowEdit ?? true
  }

  function closeBriefPreview() {
    briefPreviewKind.value = null
    briefPreviewAllowEdit.value = true
  }

  /**
   * Called from the read-only brief modal footer. Closes the preview and
   * raises a one-shot signal for the wizard view to open its edit modal.
   */
  function requestBriefPreviewEdit() {
    const kind = briefPreviewKind.value
    if (kind === null) return
    briefPreviewKind.value = null
    briefPreviewEditRequested.value = kind
  }

  function consumeBriefPreviewEditRequest() {
    briefPreviewEditRequested.value = null
  }

  function resetSlice() {
    conceptPreviewOpen.value = false
    conceptPreviewConceptId.value = null
    prPackagePreviewOpen.value = false
    prPackagePreviewPackage.value = null
    briefPreviewKind.value = null
    briefPreviewAllowEdit.value = true
    briefPreviewEditRequested.value = null
  }

  return {
    conceptPreviewOpen,
    conceptPreviewConceptId,
    prPackagePreviewOpen,
    prPackagePreviewPackage,
    briefPreviewKind,
    briefPreviewOpen,
    briefPreviewAllowEdit,
    briefPreviewEditRequested,
    openConceptPreview,
    closeConceptPreview,
    openPrPackagePreview,
    closePrPackagePreview,
    openBriefPreview,
    closeBriefPreview,
    requestBriefPreviewEdit,
    consumeBriefPreviewEditRequest,
    // Facade-internal
    resetSlice,
  }
}

export type UsePreviewsReturn = ReturnType<typeof usePreviews>
