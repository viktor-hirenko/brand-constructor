import { computed, unref, type MaybeRef } from 'vue'

/**
 * `sessionStorage`-backed snapshot of the PO's selection state captured before
 * a PO-edit session begins. Used by `PoEditConceptView` and
 * `PoEditExternalNamingView` to restore the original concept / external-naming
 * picks on «Скасувати» (Cancel) and «Назад» (Back), and to survive a hard
 * reload (F5) of the chained `concept → external-naming` flow.
 *
 * All keys are namespaced by `brandId` so simultaneous edit sessions across
 * different brand tabs cannot collide.
 *
 * ## Why entity IDs are `string`
 * Every library entity in `@brand-constructor/shared/types` (`Concept`,
 * `ExternalNaming`, …) uses `id: string` — the persisted snapshot mirrors that.
 *
 * ## Public API contract
 *  - `saveOriginalConcept(id)` is a no-op for `null` / empty string — matches
 *    the previous inline behaviour so we don't accidentally overwrite a
 *    legitimate snapshot with a `null` mid-flow.
 *  - `restoreOriginalExternal(setter)` validates the JSON payload before
 *    invoking the setter — malformed storage never reaches the store.
 *  - `clearAll()` removes every key this composable owns, including the
 *    `external` snapshot that was previously leaking through `goSave()`.
 */
export interface PoEditSnapshot {
  saveOriginalConcept: (id: string | null) => void
  loadOriginalConcept: () => string | null
  saveOriginalExternal: (ids: string[]) => void
  restoreOriginalExternal: (setter: (ids: string[]) => void) => void
  savePendingConcept: (id: string) => void
  loadPendingConcept: () => string | null
  savePendingExternal: (ids: string[]) => void
  loadPendingExternal: () => string[] | null
  clearPendingExternal: () => void
  clearAll: () => void
}

export function usePoEditSnapshot(
  brandId: MaybeRef<string | number | null | undefined>,
): PoEditSnapshot {
  const     keys = computed(() => {
    const raw = unref(brandId)
    const suffix = raw == null ? '' : String(raw)
    return {
      originalConcept: `po_edit_original_concept_${suffix}`,
      originalExternal: `po_edit_original_external_${suffix}`,
      pendingConcept: `po_edit_pending_concept_${suffix}`,
      pendingExternal: `po_edit_pending_external_${suffix}`,
    }
  })

  function saveOriginalConcept(id: string | null): void {
    if (!id) return
    sessionStorage.setItem(keys.value.originalConcept, id)
  }

  function loadOriginalConcept(): string | null {
    return sessionStorage.getItem(keys.value.originalConcept)
  }

  function saveOriginalExternal(ids: string[]): void {
    sessionStorage.setItem(keys.value.originalExternal, JSON.stringify(ids))
  }

  function restoreOriginalExternal(setter: (ids: string[]) => void): void {
    const raw = sessionStorage.getItem(keys.value.originalExternal)
    if (!raw) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      const ids = parsed.filter((value): value is string => typeof value === 'string')
      setter(ids)
    } catch {
      /* malformed snapshot — leave the store untouched */
    }
  }

  function savePendingConcept(id: string): void {
    if (!id) return
    sessionStorage.setItem(keys.value.pendingConcept, id)
  }

  function loadPendingConcept(): string | null {
    return sessionStorage.getItem(keys.value.pendingConcept)
  }

  function savePendingExternal(ids: string[]): void {
    sessionStorage.setItem(keys.value.pendingExternal, JSON.stringify(ids))
  }

  function loadPendingExternal(): string[] | null {
    const raw = sessionStorage.getItem(keys.value.pendingExternal)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return null
      return parsed.filter((v): v is string => typeof v === 'string')
    } catch {
      return null
    }
  }

  function clearPendingExternal(): void {
    sessionStorage.removeItem(keys.value.pendingExternal)
  }

  function clearAll(): void {
    sessionStorage.removeItem(keys.value.originalConcept)
    sessionStorage.removeItem(keys.value.originalExternal)
    sessionStorage.removeItem(keys.value.pendingConcept)
    sessionStorage.removeItem(keys.value.pendingExternal)
  }

  return {
    saveOriginalConcept,
    loadOriginalConcept,
    saveOriginalExternal,
    restoreOriginalExternal,
    savePendingConcept,
    loadPendingConcept,
    savePendingExternal,
    loadPendingExternal,
    clearPendingExternal,
    clearAll,
  }
}
