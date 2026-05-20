import { computed, reactive, ref, watch, type ComputedRef } from 'vue'
import { useConstructorStore } from '@/stores/constructor'
import type { CeoLibraryTab } from '@/composables/useCeoApplyVariants'

/**
 * Sections that must have a CEO comment before "Повернути на доопрацювання"
 * is accepted, *when* CEO picked an alternative there. Mirrors
 * `CEO_LIBRARY_KEYS` from `useCeoApplyVariants` — kept local to keep this
 * composable's surface self-contained.
 */
const SELECTION_REQUIRING_COMMENT: CeoLibraryTab[] = [
  'concept',
  'externalNaming',
  'internalNaming',
]

/**
 * Maps a `data-section` attribute used by the review template (and the
 * scroll-into-view triggered by failed revision validation) to the
 * comment-key stored in `store.brandCeoComments`. The two namespaces are
 * almost identical except for `mode` → `concept`, which historically lived
 * on a separate section.
 */
const SECTION_TO_COMMENT_KEY: Record<string, string> = {
  basics: 'basics',
  mode: 'concept',
  concept: 'concept',
  externalNaming: 'externalNaming',
  internalNaming: 'internalNaming',
  marketingPackage: 'marketingPackage',
  deliverables: 'deliverables',
  visualComponents: 'visualComponents',
}

interface UseCeoReviewCommentsOptions {
  /** True when the PO is viewing a brand returned by CEO (needs_revision). */
  isPoReturnedView: ComputedRef<boolean>
  /**
   * Whether the CEO's current pick for `key` differs from the PO's selection.
   * Supplied by `useCeoApplyVariants` so the two composables stay decoupled
   * and explicit-wireable from the parent.
   */
  isCeoChoiceAnAlternative: (key: CeoLibraryTab, value: string | string[]) => boolean
}

/**
 * Orchestration layer for CEO comments on the Step 10 review screen.
 *
 * Owns:
 *  - the reactive `ceoComments` mirror (keyed by section + `general`),
 *    initialised and kept in sync with `store.brandCeoComments`
 *  - the `revisionMissingSections` / `revisionRequiresAnyComment` UI gates
 *    for the "Повернути на доопрацювання" flow, plus the derived
 *    `revisionWarning` message
 *  - inline read helpers for the PO returned view (`hasSectionUnresolvedComment`,
 *    `isSectionCeoCommentResolved`, `getSectionCeoCommentValue`,
 *    `isSectionHighlighted`)
 *  - mutation handlers wired to the unified review template
 *    (`handleCeoCommentBySection`, `handleGeneralCeoCommentUpdate`,
 *    `handleCeoCommentResolve`, `handleCeoCommentUnresolve`) plus the
 *    `validateNeedsRevision` predicate used by `handleStatusChange`
 *
 * Apply-variant state and dependency-guard modals live in the sibling
 * `useCeoApplyVariants`; the parent wires them together.
 */
export function useCeoReviewComments(opts: UseCeoReviewCommentsOptions) {
  const store = useConstructorStore()
  const { isPoReturnedView, isCeoChoiceAnAlternative } = opts

  const ceoComments = reactive<Record<string, string>>({
    basics: '',
    concept: '',
    externalNaming: '',
    internalNaming: '',
    marketingPackage: '',
    deliverables: '',
    visualComponents: '',
    general: '',
  })

  /** Mirror `store.brandCeoComments` into the local string-only map (drops resolved flag). */
  watch(
    () => store.brandCeoComments,
    comments => {
      if (comments) {
        for (const [key, meta] of Object.entries(comments)) {
          if (key in ceoComments) {
            ceoComments[key] = meta.value
          }
        }
      }
    },
    { immediate: true }
  )

  /** Trimmed snapshot of every non-empty comment — the payload `handleStatusChange` ships. */
  const nonEmptyCeoComments = computed(() => {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(ceoComments)) {
      if (value.trim()) result[key] = value.trim()
    }
    return result
  })

  /** Sections currently flagged as "comment required" after a failed needs_revision attempt. */
  const revisionMissingSections = ref<Set<string>>(new Set())
  /** True when no CEO comment exists at all and CEO clicked needs_revision. */
  const revisionRequiresAnyComment = ref(false)

  const revisionWarning = computed<string | null>(() => {
    if (revisionRequiresAnyComment.value || revisionMissingSections.value.size > 0) {
      return 'Додайте хоча б один коментар перед поверненням.'
    }
    return null
  })

  function isSectionHighlighted(sectionKey: string): boolean {
    const key = SECTION_TO_COMMENT_KEY[sectionKey] ?? sectionKey
    return revisionMissingSections.value.has(key)
  }

  /**
   * Returns true when `sectionKey` has a CEO comment that PO hasn't resolved yet.
   * Only meaningful in the returned-from-CEO view.
   */
  function hasSectionUnresolvedComment(sectionKey: string): boolean {
    if (!isPoReturnedView.value) return false
    const meta = store.brandCeoComments?.[sectionKey]
    return !!meta && meta.value.trim().length > 0 && !meta.resolved
  }

  function isSectionCeoCommentResolved(sectionKey: string): boolean {
    return store.brandCeoComments?.[sectionKey]?.resolved ?? false
  }

  function getSectionCeoCommentValue(sectionKey: string): string {
    return store.brandCeoComments?.[sectionKey]?.value ?? ''
  }

  function handleCeoCommentBySection(key: string, value: string) {
    ceoComments[key] = value
    store.setCeoCommentValue(key, value)
    if (value.trim()) {
      revisionMissingSections.value.delete(key)
      if (revisionMissingSections.value.size === 0) {
        revisionRequiresAnyComment.value = false
      }
    }
  }

  function handleGeneralCeoCommentUpdate(value: string) {
    ceoComments.general = value
    store.setCeoCommentValue('general', value)
    if (value.trim()) {
      revisionRequiresAnyComment.value = false
    }
  }

  async function handleCeoCommentResolve(sectionKey: string) {
    await store.setCeoCommentResolved(sectionKey, true)
  }

  async function handleCeoCommentUnresolve(sectionKey: string) {
    await store.setCeoCommentResolved(sectionKey, false)
  }

  /**
   * Pre-flight check before issuing `PATCH /status?needs_revision`:
   *  - every alternative-pick section must carry a CEO comment, else returns
   *    `missing-section` and populates `revisionMissingSections` for highlight
   *  - if nothing is missing per-section, at least one comment overall must
   *    exist, else returns `no-comment` and flips `revisionRequiresAnyComment`
   *  - happy path resets both flags.
   */
  function validateNeedsRevision():
    | { ok: true }
    | { ok: false; reason: 'no-comment' | 'missing-section' } {
    const missing = new Set<string>()
    const sel = store.brandCeoSelections
    for (const key of SELECTION_REQUIRING_COMMENT) {
      const v = sel?.[key]
      if (
        v != null &&
        isCeoChoiceAnAlternative(key, v) &&
        !(ceoComments[key] ?? '').trim()
      ) {
        missing.add(key)
      }
    }
    if (missing.size > 0) {
      revisionMissingSections.value = missing
      revisionRequiresAnyComment.value = false
      return { ok: false, reason: 'missing-section' }
    }
    if (Object.keys(nonEmptyCeoComments.value).length === 0) {
      revisionRequiresAnyComment.value = true
      return { ok: false, reason: 'no-comment' }
    }
    revisionRequiresAnyComment.value = false
    revisionMissingSections.value = new Set()
    return { ok: true }
  }

  return {
    ceoComments,
    nonEmptyCeoComments,
    revisionMissingSections,
    revisionRequiresAnyComment,
    revisionWarning,
    isSectionHighlighted,
    hasSectionUnresolvedComment,
    isSectionCeoCommentResolved,
    getSectionCeoCommentValue,
    handleCeoCommentBySection,
    handleGeneralCeoCommentUpdate,
    handleCeoCommentResolve,
    handleCeoCommentUnresolve,
    validateNeedsRevision,
  }
}
