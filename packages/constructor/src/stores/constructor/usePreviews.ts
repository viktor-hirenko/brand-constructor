import { ref, type Ref } from 'vue'
import type { PrPackage } from '@brand-constructor/shared/types'

interface UsePreviewsOptions {
  /**
   * Concept-slider slide index from `useBrandData`. Reset to 0 when a new
   * concept preview opens so the carousel always lands on `gallery_url_1`.
   */
  step3PreviewSlideIndex: Ref<number>
}

/**
 * Preview overlay state (right-side drawer + full-screen overlay).
 *
 * Owns:
 *  - `conceptPreviewOpen` / `conceptPreviewConceptId` — full-screen carousel
 *    above the right column (CEO + PO Step 10 review)
 *  - `prPackagePreviewOpen` / `prPackagePreviewPackage` — right-side drawer
 *    used during the PO final review
 *
 * Cross-slice dep: `openConceptPreview` resets `step3PreviewSlideIndex` (owned
 * by `useBrandData`) to keep the slider behaviour unchanged when a new
 * preview opens.
 */
export function usePreviews(opts: UsePreviewsOptions) {
  const { step3PreviewSlideIndex } = opts

  /** Full-screen overlay concept preview above the right column (CEO / PO). */
  const conceptPreviewOpen = ref(false)
  const conceptPreviewConceptId = ref<string | null>(null)

  /** Right-side drawer PR package preview (PO final review). */
  const prPackagePreviewOpen = ref(false)
  const prPackagePreviewPackage = ref<PrPackage | null>(null)

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

  function resetSlice() {
    conceptPreviewOpen.value = false
    conceptPreviewConceptId.value = null
    prPackagePreviewOpen.value = false
    prPackagePreviewPackage.value = null
  }

  return {
    conceptPreviewOpen,
    conceptPreviewConceptId,
    prPackagePreviewOpen,
    prPackagePreviewPackage,
    openConceptPreview,
    closeConceptPreview,
    openPrPackagePreview,
    closePrPackagePreview,
    // Facade-internal
    resetSlice,
  }
}

export type UsePreviewsReturn = ReturnType<typeof usePreviews>
