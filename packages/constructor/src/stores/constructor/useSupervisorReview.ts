import { ref, watch, type Ref } from 'vue'
import { apiPatch } from '@/composables/useApi'
import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import {
  clearSupervisorCommentsDraft,
  clearSupervisorAlternativeDraft,
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
  /**
   * Version of the brief this tab saw, owned by `useBrandData`. «Вирішено»
   * changes the brief on the server, so the tab's next save must carry the
   * version that answer brought — else it is refused as another tab's (H-29).
   */
  serverUpdatedAt: Ref<string | null>
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
 *    perform optimistic local edits. A comment written while the brief is
 *    «На розгляді» also goes to the server shortly after the CEO stops typing
 *    (`PATCH /:id/ceo-comments`, one section per request — H-04, H-30); the
 *    status change sends the whole map once more after `flushCeoCommentSaves`
 *  - `setCeoCommentResolved` + `isCeoCommentResolveLoading` — the per-section
 *    resolve toggle that hits `PATCH /:id/ceo-comments/resolve` with optimistic
 *    update + rollback on failure
 *  - `saveCeoSelections` — partial merge of Supervisor picks via
 *    `PATCH /:id/ceo-selections`
 *
 * Cross-slice deps received via opts: wizard `stepData` ref (mutated by apply
 * variants), `brandId`, `saveBrand` callback. The facade also receives the
 * outgoing `brandCeoSelections` ref to pass into `useSupervisorAlternativeDraft`.
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
  const { stepData, brandId, brandStatus, serverUpdatedAt, saveBrand } = opts

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
   * Comments typed while the brief is «На розгляді» and not on the server yet:
   * waiting out the pause in typing, on their way, or refused (no network).
   * Only these go to the browser copy — a saved comment has its home on the
   * server, and a browser copy of it would later override a newer text written
   * on another computer.
   */
  const unsavedCommentSections = ref<Set<string>>(new Set())
  const commentSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const commentSavesInFlight = new Set<Promise<void>>()

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
    queueCeoCommentSave(sectionKey)
  }

  // ─── CEO comments on the server while the CEO types (H-04, H-30) ───────────

  /** The pause in typing after which a comment goes to the server. */
  const CEO_COMMENT_SAVE_DELAY_MS = 600

  function markCommentUnsaved(section: string, unsaved: boolean) {
    const next = new Set(unsavedCommentSections.value)
    if (unsaved) next.add(section)
    else next.delete(section)
    unsavedCommentSections.value = next
  }

  function queueCeoCommentSave(section: string) {
    const id = brandId.value
    if (!id || brandStatus.value !== BRAND_BRIEF_STATUS.SUBMITTED) return
    markCommentUnsaved(section, true)
    clearTimeout(commentSaveTimers.get(section))
    commentSaveTimers.set(
      section,
      setTimeout(() => void saveCeoComment(id, section), CEO_COMMENT_SAVE_DELAY_MS)
    )
  }

  /**
   * One section to the server. The answer carries every saved comment of the
   * brief — also those another tab of the CEO wrote — and is taken over the
   * local map, except for sections still unsaved here: the CEO may have typed
   * on while the request was on its way.
   */
  function saveCeoComment(id: string, section: string): Promise<void> {
    commentSaveTimers.delete(section)
    const sent = brandCeoComments.value?.[section]?.value ?? ''
    const run = (async () => {
      try {
        const data = await apiPatch<Brand>(`/api/brands/${id}/ceo-comments`, {
          section,
          value: sent,
        })
        if (brandId.value !== id) return
        const local = brandCeoComments.value?.[section]?.value ?? ''
        if (local === sent && !commentSaveTimers.has(section)) markCommentUnsaved(section, false)
        const merged: BrandCeoComments = { ...(data.ceoComments ?? {}) }
        for (const key of unsavedCommentSections.value) {
          const mine = brandCeoComments.value?.[key]
          if (mine) merged[key] = mine
          else delete merged[key]
        }
        brandCeoComments.value = Object.keys(merged).length > 0 ? merged : null
      } catch {
        // Stays unsaved: the browser copy keeps it for F5, and the decision
        // («Повернути» / «Затвердити») sends the whole map anyway.
      }
    })()
    commentSavesInFlight.add(run)
    void run.finally(() => commentSavesInFlight.delete(run))
    return run
  }

  /** Sends what is still waiting out the pause and waits for every save on its way. */
  async function flushCeoCommentSaves(): Promise<void> {
    const id = brandId.value
    for (const [section, timer] of [...commentSaveTimers]) {
      clearTimeout(timer)
      if (id) void saveCeoComment(id, section)
    }
    commentSaveTimers.clear()
    await Promise.all([...commentSavesInFlight])
  }

  function dropPendingCommentSaves() {
    for (const timer of commentSaveTimers.values()) clearTimeout(timer)
    commentSaveTimers.clear()
    unsavedCommentSections.value = new Set()
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
      if (data.updatedAt) serverUpdatedAt.value = data.updatedAt
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
   * «Застосувати варіант CEO» answers the CEO's comment in that section: the
   * Author took exactly what the CEO asked for. The comment is marked resolved
   * (the Author can still un-mark it), so «N секцій потребують уваги» goes
   * down. Before 05.10 the comment stayed open and the counter did not move
   * after the apply (H-11, run 02.10: T-042) — and the CEO must comment every
   * section they change, so it never could.
   */
  async function resolveCeoCommentsOnApply(sections: string[]) {
    for (const section of sections) {
      const meta = brandCeoComments.value?.[section]
      if (!meta || !meta.value.trim() || meta.resolved) continue
      await setCeoCommentResolved(section, true)
    }
  }

  /**
   * Applies CEO's suggested alternative for a single section to PO's stepData,
   * then persists via saveBrand().
   *
   * `concept` — overwrites stepData.concept.selectedId. The Author's External
   *   Naming stays when the CEO also proposed External Naming — the drawn state
   *   after this click (`1985:2589`, `1985:2188`) keeps «Вибір замовника» next
   *   to «Вибір CEO» with «Застосувати варіант CEO», and the section keeps
   *   blocking «На погодження CEO» until the Author applies or edits it. It is
   *   cleared only when the CEO proposed a concept alone: then nothing else
   *   would make the Author pick names for the new concept. Before 30.09 it was
   *   always cleared, silently. See `shouldClearExternalOnConceptApply`.
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
        if (shouldClearExternalOnConceptApply(readSelectionAsArray(sel?.externalNaming))) {
          // CEO changed the concept only: the old names cannot stay unnoticed.
          stepData.value.externalNaming.selectedIds = []
          stepData.value.externalNaming.newNamingBrief = null
        }
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
      const saved = await saveBrand()
      if (saved) await resolveCeoCommentsOnApply([section])
      return saved
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
      const saved = await saveBrand()
      if (saved) {
        await resolveCeoCommentsOnApply(ceoExt.length > 0 ? ['concept', 'externalNaming'] : ['concept'])
      }
      return saved
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
      if (brandId.value) clearSupervisorAlternativeDraft(brandId.value)
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
   * Keeps the comments that are not on the server yet in localStorage
   * (debounced): a refused save (no network) survives F5. Saved comments are
   * not copied — the server holds them, and since 05.10 it holds them while
   * the CEO types (H-04). The status-change handler in `BriefReviewView`
   * purges this envelope after a successful PATCH via
   * `purgeSupervisorCommentsCache`.
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
    const map: BrandCeoComments = {}
    for (const key of unsavedCommentSections.value) {
      const meta = brandCeoComments.value?.[key]
      if (meta) map[key] = meta
    }
    if (Object.keys(map).length > 0) {
      writeSupervisorCommentsDraft(brandId.value, map, brandStatus.value)
    } else {
      clearSupervisorCommentsDraft(brandId.value)
    }
  }, 400)

  watch([brandCeoComments, unsavedCommentSections], persistSupervisorComments, { deep: true })

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
    // The copy holds only what had not reached the server: it goes over the
    // server's comments, section by section, and is sent again.
    const overlay = envelope.draft.commentsOverlay ?? {}
    const merged: BrandCeoComments = { ...(brandCeoComments.value ?? {}), ...overlay }
    isRestoringComments.value = true
    brandCeoComments.value = Object.keys(merged).length > 0 ? merged : null
    queueMicrotask(() => {
      isRestoringComments.value = false
    })
    for (const section of Object.keys(overlay)) queueCeoCommentSave(section)
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
    dropPendingCommentSaves()
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
    dropPendingCommentSaves()
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
    flushCeoCommentSaves,
    // Facade-internal
    loadCeo,
    resetSlice,
  }
}

export type UseSupervisorReviewReturn = ReturnType<typeof useSupervisorReview>

/**
 * «Застосувати варіант CEO» in Concept: clear the Author's External Naming only
 * when the CEO proposed no External Naming of their own. With a CEO proposal the
 * section stays «Потрібно обрати варіант» and blocks submit by itself.
 */
export function shouldClearExternalOnConceptApply(ceoExternalIds: string[]): boolean {
  return ceoExternalIds.length === 0
}
