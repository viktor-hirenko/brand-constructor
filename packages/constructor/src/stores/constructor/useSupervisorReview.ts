import { ref, watch, type Ref } from 'vue'
import { apiPatch } from '@/composables/useApi'
import {
  clearSupervisorCommentsDraft,
  clearSupervisorReselectDraft,
  readSupervisorCommentsDraft,
  writeSupervisorCommentsDraft,
} from '@/domain/persistence/briefDraftStorage'
import { readSelectionAsString, readSelectionAsArray } from './selectionHelpers'
import type {
  Brand,
  BrandCeoComments,
  BrandStepData,
  CeoCommentMeta,
} from '@brand-constructor/shared/types'

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

interface UseSupervisorReviewOptions {
  /** Wizard step-data ref owned by `useBrandData` — `applyCeoVariant` mutates it before saveBrand(). */
  stepData: Ref<BrandStepData>
  /** Brand id ref owned by `useBrandData` — used to address the PATCH endpoints. */
  brandId: Ref<string | null>
  /** Brand status ref owned by `useBrandData` — used as stale-protection in the supervisor-comments envelope. */
  brandStatus: Ref<string>
  /** `saveBrand()` from `useBrandData` — applyCeoVariant persists via the same wizard PUT. */
  saveBrand: () => Promise<boolean>
}

/**
 * Supervisor-review slice of the constructor store.
 *
 * Owns:
 *  - `brandCeoComments` (the `CeoCommentMeta` map persisted on the brand)
 *  - `brandCeoSelections` (Supervisor library overrides — concept /
 *    external naming / internal naming) plus their save error +
 *    per-section loading flags
 *  - the "apply variant" flow used by the Author's returned-from-Supervisor
 *    view: `applyCeoVariant` (single section) and
 *    `applyCeoConceptAndExternal` (concept + external together, used by the
 *    "Застосувати все" modal)
 *  - mutation helpers `setCeoCommentValue` / `setCeoSelectionValue` that
 *    perform optimistic local edits — persistence happens later through the
 *    status-change handler (`PATCH /:id/status`)
 *  - `setCeoCommentResolved` + `isCeoCommentResolveLoading` — the per-section
 *    resolve toggle that hits `PATCH /:id/ceo-comments/resolve` with optimistic
 *    update + rollback on failure
 *  - `saveCeoSelections` — partial merge of Supervisor picks via
 *    `PATCH /:id/ceo-selections`
 *
 * Cross-slice deps received via opts: wizard `stepData` ref (mutated by apply
 * variants), `brandId`, `saveBrand` callback. The facade also receives the
 * outgoing `brandCeoSelections` ref to pass into `useSupervisorReselectDraft`.
 *
 * NB on naming: this slice's **public surface** still uses the `ceo*` prefix
 * (`brandCeoComments`, `brandCeoSelections`, `setCeoCommentValue`, …) because
 * those names are part of the frontend↔worker contract — the D1 `brands`
 * row stores `ceoComments` / `ceoSelections` keys and the worker exposes
 * `/api/brands/:id/ceo-comments/resolve` + `/api/brands/:id/ceo-selections`
 * endpoints. Renaming the public surface requires a backend migration and
 * sits outside this refactor's scope; only the slice's identity (factory
 * function + filename) has been updated to the new `Supervisor` vocabulary.
 */
export function useSupervisorReview(opts: UseSupervisorReviewOptions) {
  const { stepData, brandId, brandStatus, saveBrand } = opts

  const brandCeoComments = ref<BrandCeoComments | null>(null)
  const brandCeoSelections = ref<Record<string, string | string[]> | null>(null)

  /**
   * Guard against the F5-restore writing the just-restored overlay back to
   * localStorage and resetting the `savedAt` timestamp (which would defeat
   * stale-protection).
   */
  const isRestoringComments = ref(false)

  const saveCeoSelectionsError = ref<string | null>(null)
  const saveCeoCommentResolvedError = ref<string | null>(null)
  const saveCeoCommentResolvedErrorSection = ref<string | null>(null)
  const saveCeoCommentResolvedLoading = ref<Set<string>>(new Set())

  const isApplyingCeoVariant = ref(false)
  const applyCeoVariantError = ref<string | null>(null)

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
    saveCeoCommentResolvedErrorSection.value = null
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
      saveCeoCommentResolvedError.value = null
      saveCeoCommentResolvedErrorSection.value = null
      return true
    } catch (error) {
      brandCeoComments.value = prevSnapshot
      saveCeoCommentResolvedErrorSection.value = sectionKey
      saveCeoCommentResolvedError.value = 'Не вдалося зберегти. Спробуйте ще раз.'
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

  /**
   * Merge partial CEO selection keys, persist via PATCH /ceo-selections,
   * update local store from response.
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
      // Purge localStorage cache — picks are now persisted on the server.
      if (brandId.value) clearSupervisorReselectDraft(brandId.value)
      return true
    } catch (error) {
      brandCeoSelections.value = Object.keys(previous).length > 0 ? previous : null
      saveCeoSelectionsError.value =
        error instanceof Error ? error.message : 'Failed to save CEO selections'
      return false
    }
  }

  // ─── F5 persistence of Supervisor comments ─────────────────────────────────

  /**
   * Persists `brandCeoComments` to localStorage on every change (debounced).
   *
   * Why this exists: comments only reach the server on a status-change PATCH
   * (Approve / Needs Revision). Between typing and pressing the button — and
   * across page refreshes during that window — the only durable home for the
   * comment text is the supervisor-comments envelope. The status-change
   * handler in `BriefReviewView` purges this envelope after a successful
   * PATCH via `purgeSupervisorCommentsCache`.
   *
   * The `isRestoringComments` guard prevents the watcher from echoing the
   * just-restored overlay back to storage (which would reset `savedAt` and
   * defeat stale-protection). It is also used during `loadCeo` / `resetSlice`
   * so the server-loaded baseline (or null reset) doesn't overwrite a
   * still-valid envelope before `restoreSupervisorCommentsFromStorage` runs.
   */
  const persistSupervisorComments = debounce(() => {
    if (isRestoringComments.value) return
    if (!brandId.value) return
    const map = brandCeoComments.value
    if (map && Object.keys(map).length > 0) {
      writeSupervisorCommentsDraft(brandId.value, map, brandStatus.value)
    } else {
      clearSupervisorCommentsDraft(brandId.value)
    }
  }, 400)

  watch(brandCeoComments, persistSupervisorComments, { deep: true })

  /**
   * Overlays cached Supervisor comments over the freshly loaded server state.
   * Called from the router AFTER `loadBrand` (which in turn calls `loadCeo`).
   *
   * Stale-protection: if the cached `briefStatus` no longer matches the
   * current `brandStatus` (e.g. the Author already resubmitted, moving the
   * brief from `needs_revision` back to `submitted`), the envelope is
   * discarded — there is no meaningful way to merge old supervisor comments
   * onto a transitioned brief.
   */
  function restoreSupervisorCommentsFromStorage(briefId: string): void {
    if (!briefId) return
    const envelope = readSupervisorCommentsDraft(briefId)
    if (!envelope) return
    if (envelope.briefStatus && envelope.briefStatus !== brandStatus.value) {
      clearSupervisorCommentsDraft(briefId)
      return
    }
    const overlay = envelope.draft.commentsOverlay
    isRestoringComments.value = true
    brandCeoComments.value = overlay && Object.keys(overlay).length > 0 ? overlay : null
    queueMicrotask(() => {
      isRestoringComments.value = false
    })
  }

  /** Drop the cached envelope — called after PATCH /status succeeds. */
  function purgeSupervisorCommentsCache(): void {
    if (brandId.value) clearSupervisorCommentsDraft(brandId.value)
  }

  // ─── Facade-orchestrated load + reset ──────────────────────────────────────

  /** Hydrates CEO comments + selections. Called by the facade's `loadBrand`. */
  function loadCeo(
    comments: BrandCeoComments | null,
    selections: Record<string, string | string[]> | null
  ) {
    saveCeoSelectionsError.value = null
    saveCeoCommentResolvedError.value = null
    saveCeoCommentResolvedErrorSection.value = null
    saveCeoCommentResolvedLoading.value = new Set()
    isApplyingCeoVariant.value = false
    applyCeoVariantError.value = null
    // Guard the watcher: server hydration must NOT overwrite a still-valid
    // supervisor-comments envelope before the router has a chance to call
    // `restoreSupervisorCommentsFromStorage`.
    isRestoringComments.value = true
    brandCeoComments.value = comments
    brandCeoSelections.value = selections
    queueMicrotask(() => {
      isRestoringComments.value = false
    })
  }

  function resetSlice() {
    isRestoringComments.value = true
    brandCeoComments.value = null
    brandCeoSelections.value = null
    saveCeoSelectionsError.value = null
    saveCeoCommentResolvedError.value = null
    saveCeoCommentResolvedErrorSection.value = null
    saveCeoCommentResolvedLoading.value = new Set()
    isApplyingCeoVariant.value = false
    applyCeoVariantError.value = null
    queueMicrotask(() => {
      isRestoringComments.value = false
    })
  }

  return {
    brandCeoComments,
    brandCeoSelections,
    saveCeoSelectionsError,
    saveCeoCommentResolvedError,
    saveCeoCommentResolvedErrorSection,
    isApplyingCeoVariant,
    applyCeoVariantError,
    setCeoCommentValue,
    setCeoCommentResolved,
    isCeoCommentResolveLoading,
    applyCeoVariant,
    applyCeoConceptAndExternal,
    setCeoSelectionValue,
    saveCeoSelections,
    // F5 persistence of Supervisor comments
    restoreSupervisorCommentsFromStorage,
    purgeSupervisorCommentsCache,
    // Facade-internal
    loadCeo,
    resetSlice,
  }
}

export type UseSupervisorReviewReturn = ReturnType<typeof useSupervisorReview>
