import { watch, type Ref } from 'vue'
import type { BrandStepData } from '@brand-constructor/shared/types'
import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared/constants'
import {
  writeWizardDraftCopy,
  readWizardDraftCopy,
  clearWizardDraftCopy,
} from '@/domain/persistence/briefDraftStorage'
import { normalizeWizardStepData } from '@/utils/brandHydration'
import { logSilent } from '@/utils/log'

interface UseWizardDraftCopyOptions {
  brandId: Ref<string | null>
  brandStatus: Ref<string>
  /** From `useBrandData` — mirrored on change, replaced on restore. */
  stepData: Ref<BrandStepData>
  /** From `useInlineSectionEdit` — the copy is not written while a section is being re-edited. */
  editingSection: Ref<string | null>
}

/**
 * Browser copy of the Author's unsaved wizard answers on a `draft` brief.
 *
 * The wizard writes to the server on «Далі» only, and a brief gets its id on
 * «Order New Brand» — so everything typed on a step lived in the tab's memory
 * and was gone after F5, a closed tab, browser «back», the Admin menu or an
 * expired session (H-25, H-26, H-27). This slice mirrors `stepData` to
 * localStorage by brief id as it changes and puts it back when the draft is
 * opened again.
 *
 * Rules:
 *  - `draft` only. A returned brief has its own copy (`useAuthorRevisionDraft`).
 *  - The copy is applied only while the server still reports the `updatedAt`
 *    it was made on top of; if the brief was saved elsewhere, the server wins.
 *  - Nothing is written while a section is being re-edited from the final
 *    review («Редагувати»): an abandoned edit must leave the brief as it was.
 *    «Зберегти» there goes through `flushWizardDraftCopy()` — that is a
 *    decision to keep the edit, and it must survive an expired session.
 *  - A successful save drops the copy.
 */
export function useWizardDraftCopy(opts: UseWizardDraftCopyOptions) {
  const { brandId, brandStatus, stepData, editingSection } = opts

  /** Server `updatedAt` the in-memory brief sits on top of, and whose brief it is. */
  let base: { briefId: string; updatedAt: string } | null = null
  /** `stepData` as the server has it — a copy equal to it is not worth keeping. */
  let syncedJson: string | null = null

  function syncCopy() {
    const id = brandId.value
    if (!id || !base || base.briefId !== id) return
    if (brandStatus.value !== BRAND_BRIEF_STATUS.DRAFT) return
    if (JSON.stringify(stepData.value) === syncedJson) {
      clearWizardDraftCopy(id)
      return
    }
    writeWizardDraftCopy(id, base.updatedAt, stepData.value)
  }

  watch(
    stepData,
    () => {
      if (editingSection.value) return
      syncCopy()
    },
    { deep: true }
  )

  /** Writes the copy now, edit session or not — called right before a save. */
  function flushWizardDraftCopy() {
    syncCopy()
  }

  /** The server has what is in memory: new base, no copy. */
  function markWizardDraftSaved(serverUpdatedAt: string | null) {
    const id = brandId.value
    if (!id) return
    clearWizardDraftCopy(id)
    syncedJson = JSON.stringify(stepData.value)
    if (serverUpdatedAt) base = { briefId: id, updatedAt: serverUpdatedAt }
  }

  /**
   * Called right after `loadBrand()` with the brief's server `updatedAt`.
   * Overlays the cached answers when they were made on top of this very
   * server state; otherwise drops them.
   */
  function restoreWizardDraftCopy(briefId: string, serverUpdatedAt: string) {
    base = { briefId, updatedAt: serverUpdatedAt }
    syncedJson = JSON.stringify(stepData.value)
    try {
      const envelope = readWizardDraftCopy(briefId)
      if (!envelope) return
      if (
        brandStatus.value !== BRAND_BRIEF_STATUS.DRAFT ||
        envelope.baseUpdatedAt !== serverUpdatedAt ||
        !envelope.draft.stepData
      ) {
        clearWizardDraftCopy(briefId)
        return
      }
      stepData.value = normalizeWizardStepData(envelope.draft.stepData)
    } catch (err) {
      logSilent('useWizardDraftCopy/restore', err)
    }
  }

  function resetSlice() {
    base = null
    syncedJson = null
  }

  return {
    restoreWizardDraftCopy,
    // Facade-internal
    flushWizardDraftCopy,
    markWizardDraftSaved,
    resetSlice,
  }
}

export type UseWizardDraftCopyReturn = ReturnType<typeof useWizardDraftCopy>
