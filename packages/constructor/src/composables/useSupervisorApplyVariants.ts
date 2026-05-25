import { computed, ref, type ComputedRef } from 'vue'
import type { Router } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import {
  readSelectionAsString as ceoSelectionAsString,
  readSelectionAsArray as ceoSelectionAsArray,
} from '@/stores/constructor/selectionHelpers'
import {
  isCeoChoiceAnAlternative as isCeoChoiceAnAlternativePure,
  type CeoLibraryTab,
} from '@/utils/ceoRevisionGate'
import type {
  Concept,
  ExternalNaming,
  InternalNaming,
} from '@brand-constructor/shared/types'

/**
 * Library "tabs" that CEO can override on the brand brief review screen.
 * Concepts, External Naming and Internal Naming are the only three sections
 * the CEO can re-pick — everything else (Brand Basics, PR Package, Deliverables,
 * Visual Components) is text/configuration the PO owns end-to-end.
 */
export type { CeoLibraryTab } from '@/utils/ceoRevisionGate'
export { CEO_LIBRARY_KEYS, ATTENTION_SECTION_KEYS } from '@/utils/ceoRevisionGate'

interface UseSupervisorApplyVariantsOptions {
  /**
   * True when the Author (Product Owner) is viewing a brand that was
   * returned by the Supervisor (`needs_revision`).
   */
  isPoReturnedView: ComputedRef<boolean>
  /** Library entries needed to resolve Supervisor picks into display objects. */
  concepts: ComputedRef<Concept[]>
  externalNamings: ComputedRef<ExternalNaming[]>
  internalNamings: ComputedRef<InternalNaming[]>
  /** Router instance — used by the dependency-guard modal that jumps to po-edit/concept. */
  router: Router
}

/**
 * Orchestration layer for the Supervisor "apply variant" flow on the
 * Step 10 review screen. Owns:
 *
 *  - pure helpers for normalising `string | string[]` Supervisor selections
 *    (`ceoSelectionAsString`, `ceoSelectionAsArray`,
 *    `flattenCeoCommentsForPdf`, `isCeoChoiceAnAlternative`)
 *  - per-section "applied" computeds (Author returned view)
 *    (`isCeoConceptApplied`, `isCeoExternalApplied`,
 *    `isCeoInternalApplied`, `hasConceptMismatch`)
 *  - the unified `attentionCounter` + `submitBlocked` gate, plus
 *    `sectionApplyFlags` consumed by `<ReviewUnifiedView>`
 *  - Supervisor display projections rendered next to the Author selection
 *    (`reviewCeoConceptForBlock`, `ceoExternalItemsForReview`,
 *    `ceoInternalNameForReview`)
 *  - the two Figma dependency-guard modals (`1985:4362` / `1985:4657`)
 *    with their `showApply…` / `showEdit…` ref state and apply handlers
 *
 * The reactive Supervisor-comment mirror (Step 10 sibling concerns) lives
 * in `useSupervisorReviewComments`; that composable consumes
 * `isCeoChoiceAnAlternative` from here via explicit prop wiring done by
 * the parent.
 *
 * NB on naming: the composable's **public surface** still uses the `ceo*`
 * prefix on its computed refs and helper return values
 * (`isCeoConceptApplied`, `ceoExternalItemsForReview`,
 * `ceoSelectionAsString`, …) because those names mirror the
 * frontend↔worker contract (D1 `brands.ceoSelections` /
 * `brands.ceoComments`) — see `useSupervisorReview` for the full
 * rationale. Only the composable's identity (factory function + filename)
 * has been updated to the new vocabulary.
 */
export function useSupervisorApplyVariants(opts: UseSupervisorApplyVariantsOptions) {
  const store = useConstructorStore()
  const { isPoReturnedView, concepts, externalNamings, internalNamings, router } = opts

  // ─── Pure helpers ─────────────────────────────────────────────────────────

  // ceoSelectionAsString / ceoSelectionAsArray are imported from selectionHelpers
  // (aliased to keep the public return API of this composable unchanged).

  /**
   * PDF generator (`usePrintBrand`) expects `Record<string, string>` —
   * flatten the CEO comment meta map before passing it in.
   */
  function flattenCeoCommentsForPdf(
    comments: Record<string, { value: string }> | null
  ): Record<string, string> | null {
    if (!comments) return null
    const out: Record<string, string> = {}
    for (const [k, meta] of Object.entries(comments)) {
      if (meta.value.trim()) out[k] = meta.value
    }
    return Object.keys(out).length > 0 ? out : null
  }

  function poLibrarySelections() {
    return {
      conceptId: store.stepData.concept.selectedId,
      externalIds: store.stepData.externalNaming.selectedIds ?? [],
      internalId: store.stepData.internalNaming.selectedId,
    }
  }

  function isCeoChoiceAnAlternative(key: CeoLibraryTab, ceoValue: string | string[]): boolean {
    return isCeoChoiceAnAlternativePure(key, ceoValue, poLibrarySelections())
  }

  // ─── Applied-state computeds (PO returned view) ────────────────────────────

  /**
   * True when the Author has resolved the concept conflict, either by:
   *  1. Picking the Supervisor's exact suggestion, OR
   *  2. Going through the edit-flow and saving their own deliberate choice
   *     (the «third-option» case, tracked via `resolvedConflictSections`).
   */
  const isCeoConceptApplied = computed(() => {
    if (!isPoReturnedView.value) return false
    const ceoConcept = ceoSelectionAsString(store.brandCeoSelections?.concept)
    if (!ceoConcept) return false
    if (store.stepData.concept.selectedId === ceoConcept) return true
    return store.authorRevisionDraft.resolvedConflictSections.includes('concept')
  })

  const isCeoExternalApplied = computed(() => {
    if (!isPoReturnedView.value) return false
    const ceoExt = ceoSelectionAsArray(store.brandCeoSelections?.externalNaming)
    if (ceoExt.length === 0) return false
    // Exact CEO match
    const poExt = store.stepData.externalNaming.selectedIds
    if (poExt.length === ceoExt.length && ceoExt.every(id => poExt.includes(id))) return true
    // Author resolved via edit-flow with a third-option pick
    return store.authorRevisionDraft.resolvedConflictSections.includes('externalNaming')
  })

  const isCeoInternalApplied = computed(() => {
    if (!isPoReturnedView.value) return false
    const ceoInt = ceoSelectionAsString(store.brandCeoSelections?.internalNaming)
    if (!ceoInt) return false
    if (store.stepData.internalNaming.selectedId === ceoInt) return true
    return store.authorRevisionDraft.resolvedConflictSections.includes('internalNaming')
  })

  /**
   * CEO proposed a different concept AND it hasn't been applied yet.
   * Blocks editing External Naming until concept is resolved (Figma 1985:4657).
   */
  const hasConceptMismatch = computed(() => {
    if (!isPoReturnedView.value) return false
    return (
      isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') &&
      !isCeoConceptApplied.value
    )
  })

  // ─── Attention counter + submit gate (PO returned view) ───────────────────

  /**
   * Number of sections that require Author attention:
   *  - has an unresolved Supervisor comment, OR
   *  - Supervisor proposed an alternative that the Author hasn't resolved yet.
   *
   * Library sections (concept / externalNaming / internalNaming) use the
   * updated `isCeoXxxApplied` computeds, which treat the Author's third-option
   * pick as resolved — so this counter correctly reaches 0 after the edit-flow
   * saves, regardless of whether the Author picked the Supervisor's suggestion
   * or their own choice.
   * `general` comment is excluded per spec.
   */
  const attentionCounter = computed(() => {
    if (!isPoReturnedView.value) return 0

    const comments = store.brandCeoComments
    const ceoSel = store.brandCeoSelections

    function commentUnresolved(key: string): boolean {
      const meta = comments?.[key]
      return !!meta && !!meta.value?.trim() && !meta.resolved
    }

    let count = 0

    // Non-library sections: only CEO comments matter.
    for (const key of ['basics', 'marketingPackage', 'deliverables', 'visualComponents']) {
      if (commentUnresolved(key)) count++
    }

    // Library sections: unresolved comment OR un-resolved alternative.
    if (
      commentUnresolved('concept') ||
      (isCeoChoiceAnAlternative('concept', ceoSel?.concept ?? '') && !isCeoConceptApplied.value)
    ) count++

    if (
      commentUnresolved('externalNaming') ||
      (isCeoChoiceAnAlternative('externalNaming', ceoSel?.externalNaming ?? '') && !isCeoExternalApplied.value)
    ) count++

    if (
      commentUnresolved('internalNaming') ||
      (isCeoChoiceAnAlternative('internalNaming', ceoSel?.internalNaming ?? '') && !isCeoInternalApplied.value)
    ) count++

    return count
  })

  /** Blocks «На погодження CEO» while any section still needs attention. */
  const submitBlocked = computed(() => isPoReturnedView.value && attentionCounter.value > 0)

  /**
   * Per-section flags for `<ReviewUnifiedView>` — whether the section currently
   * shows the "needs choice" badge and the "Apply CEO" CTA (PO returned view
   * only, when CEO picked a different library item and PO has not yet applied
   * or overridden it).
   */
  const sectionApplyFlags = computed(() => ({
    conceptNeedsChoice:
      isPoReturnedView.value &&
      isCeoChoiceAnAlternative('concept', store.brandCeoSelections?.concept ?? '') &&
      !isCeoConceptApplied.value,
    externalNamingNeedsChoice:
      isPoReturnedView.value &&
      isCeoChoiceAnAlternative(
        'externalNaming',
        store.brandCeoSelections?.externalNaming ?? ''
      ) &&
      !isCeoExternalApplied.value,
    internalNamingNeedsChoice:
      isPoReturnedView.value &&
      isCeoChoiceAnAlternative(
        'internalNaming',
        store.brandCeoSelections?.internalNaming ?? ''
      ) &&
      !isCeoInternalApplied.value,
  }))

  // ─── CEO display projections (resolved against libraries) ──────────────────

  /** CEO pick shown next to PO when it differs from PO (brand brief review). */
  const reviewCeoConceptForBlock = computed(() => {
    const id = ceoSelectionAsString(store.brandCeoSelections?.concept)
    if (!id) return null
    if (!isCeoChoiceAnAlternative('concept', id)) return null
    return concepts.value.find(c => c.id === id) ?? null
  })

  const ceoExternalItemsForReview = computed(() => {
    const ids = ceoSelectionAsArray(store.brandCeoSelections?.externalNaming)
    if (ids.length === 0 || !isCeoChoiceAnAlternative('externalNaming', ids)) return []
    const poIdSet = new Set(store.stepData.externalNaming.selectedIds ?? [])
    // Показуємо в колонці CEO лише те, чого немає у виборі замовника (без дублювання TestEcho тощо).
    let displayIds = ids.filter(id => !poIdSet.has(id))
    if (displayIds.length === 0) displayIds = ids
    return displayIds
      .map(id => externalNamings.value.find(x => x.id === id))
      .filter((n): n is ExternalNaming => n != null)
      .map(n => ({
        id: n.id,
        name: n.name,
        domain: (n as ExternalNaming & { domain?: string }).domain,
      }))
  })

  const ceoInternalNameForReview = computed(() => {
    const id = ceoSelectionAsString(store.brandCeoSelections?.internalNaming)
    if (!id || !isCeoChoiceAnAlternative('internalNaming', id)) return null
    return internalNamings.value.find(n => n.id === id)?.name ?? null
  })

  // ─── Dependency-guard modals (Figma 1985:4362, 1985:4657) ─────────────────

  /** Modal 1: PO tries to apply CEO external naming while CEO concept is still pending. */
  const showApplyExternalBeforeConceptModal = ref(false)
  /** Modal 2: PO tries to edit external naming while concept mismatch exists. */
  const showEditExternalBeforeConceptModal = ref(false)

  async function handleApplyCeoVariant(section: CeoLibraryTab) {
    if (section === 'externalNaming' && hasConceptMismatch.value) {
      showApplyExternalBeforeConceptModal.value = true
      return
    }
    await store.applyCeoVariant(section)
  }

  async function handleApplyAll() {
    showApplyExternalBeforeConceptModal.value = false
    await store.applyCeoConceptAndExternal()
  }

  function handleGoToEditConcept() {
    showEditExternalBeforeConceptModal.value = false
    const bid = store.brandId
    if (bid) router.push(`/constructor/brand/${bid}/po-edit/concept`)
  }

  return {
    ceoSelectionAsString,
    ceoSelectionAsArray,
    flattenCeoCommentsForPdf,
    isCeoChoiceAnAlternative,
    isCeoConceptApplied,
    isCeoExternalApplied,
    isCeoInternalApplied,
    hasConceptMismatch,
    attentionCounter,
    submitBlocked,
    sectionApplyFlags,
    reviewCeoConceptForBlock,
    ceoExternalItemsForReview,
    ceoInternalNameForReview,
    showApplyExternalBeforeConceptModal,
    showEditExternalBeforeConceptModal,
    handleApplyCeoVariant,
    handleApplyAll,
    handleGoToEditConcept,
  }
}
