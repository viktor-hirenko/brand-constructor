import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { BRAND_BRIEF_REVIEW_PHASE } from '@/domain/reviewPhase/BrandBriefReviewPhase'
import { resolveBrandBriefReviewPhase } from '@/domain/reviewPhase/resolveBrandBriefReviewPhase'
import type { LayoutMode } from '@/components/constructor/layout/dualPaneLayoutClasses'

export { BRAND_BRIEF_REVIEW_PHASE }
export type { BrandBriefReviewPhase } from '@/domain/reviewPhase/BrandBriefReviewPhase'

/**
 * Reactive composable that derives the current `BrandBriefReviewPhase` from
 * live route meta, brief status and user role.
 *
 * Replaces the six manual inline computed flags that previously lived in
 * `BriefShellView.vue` (`isCeoReselect`, `isPoEdit`, `isCeoFinalize`,
 * `isPoDraftReview`, `isPoReturnedReview`, `isApprovedReview`, `isReviewShell`,
 * `layoutMode`).
 */
export function useBrandBriefReviewPhase() {
  const route = useRoute()
  const store = useConstructorStore()
  const authStore = useAuthStore()

  const reviewPhase = computed(() =>
    resolveBrandBriefReviewPhase({
      status: store.brandStatus ?? 'draft',
      isSupervisor: authStore.isCeo,
      routeIsCeoReselect: route.meta.ceoReselect === true,
      routeIsPoEdit: route.meta.poEdit === true,
      routeStep: route.meta.step as number | undefined,
    })
  )

  // ─── Named phase booleans (preferred in templates for readability) ─────────

  const isAlternativeSelection = computed(
    () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.ALTERNATIVE_SELECTION
  )

  const isRevisionResponse = computed(
    () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE
  )

  const isSupervisorReview = computed(
    () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_REVIEW
  )

  const isAuthorReturned = computed(
    () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED
  )

  const isApprovedPhase = computed(
    () => reviewPhase.value === BRAND_BRIEF_REVIEW_PHASE.APPROVED
  )

  // ─── Layout helpers ────────────────────────────────────────────────────────

  /**
   * True when the wizard chrome (step header, progress bar, nav footer) should
   * be hidden and the review shell is active.
   * Equivalent to the former `isReviewShell` flag in `BriefShellView.vue`.
   */
  const isReviewShell = computed(
    () => reviewPhase.value !== BRAND_BRIEF_REVIEW_PHASE.WIZARD
  )

  /**
   * Pane layout mode consumed by `ConstructorDualPaneShell`.
   * Replaces the former inline `layoutMode` computed in `BriefShellView.vue`.
   */
  const layoutMode = computed<LayoutMode>(() => {
    const phase = reviewPhase.value
    if (
      phase === BRAND_BRIEF_REVIEW_PHASE.ALTERNATIVE_SELECTION ||
      phase === BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE
    ) {
      return 'edit'
    }
    if (phase === BRAND_BRIEF_REVIEW_PHASE.WIZARD) return 'wizard'
    return 'review'
  })

  return {
    reviewPhase,
    isAlternativeSelection,
    isRevisionResponse,
    isSupervisorReview,
    isAuthorReturned,
    isApprovedPhase,
    isReviewShell,
    layoutMode,
  }
}
