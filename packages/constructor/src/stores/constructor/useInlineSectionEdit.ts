import { ref, type Ref } from 'vue'
import type {
  BrandStepData,
  BrandBasicsData,
  BrandConceptData,
  BrandExternalNamingData,
  BrandInternalNamingData,
  BrandMarketingPackageData,
  BrandDeliverablesData,
  BrandVisualComponentsData,
} from '@brand-constructor/shared/types'

interface UseInlineSectionEditOptions {
  /** Wizard step-data from `useBrandData` — read for snapshot, written on cancel. */
  stepData: Ref<BrandStepData>
  /**
   * `returnToStep` from `useBrandData` — `beginEditSection` records the entry
   * point, `commit`/`cancel` clear it so the layout knows to forget the
   * back-target.
   */
  returnToStep: Ref<number | null>
}

/**
 * Inline section-edit flow triggered from the Author's final review (Step 10).
 *
 * Owns:
 *  - `editingSection` — the key of the section currently being inline-edited
 *    (or `null` outside the edit flow); also drives the wizard footer to show
 *    "Скасувати / Зберегти" instead of the regular Назад/Далі pair
 *  - `editingSectionSnapshot` — deep-cloned slice taken at `beginEditSection`
 *    time so `cancelEditSection` can restore untouched state
 *
 * The two private helpers `getSectionStateByKey` / `restoreSectionStateByKey`
 * stay scoped to this slice — they are the slice's own mapping between review
 * section keys and the corresponding `stepData` slot.
 */
export function useInlineSectionEdit(opts: UseInlineSectionEditOptions) {
  const { stepData, returnToStep } = opts

  const editingSection = ref<string | null>(null)
  const editingSectionSnapshot = ref<unknown>(null)

  /** Maps a Review section key to the matching slice of stepData. */
  function getSectionStateByKey(key: string): unknown {
    switch (key) {
      case 'basics':
        return stepData.value.brandBasics
      case 'concept':
        return stepData.value.concept
      case 'externalNaming':
        return stepData.value.externalNaming
      case 'internalNaming':
        return stepData.value.internalNaming
      case 'marketingPackage':
        return stepData.value.marketingPackage
      case 'deliverables':
        return stepData.value.deliverables
      case 'visualComponents':
        return stepData.value.visualComponents
      default:
        return null
    }
  }

  function restoreSectionStateByKey(key: string, value: unknown) {
    if (value == null) return
    switch (key) {
      case 'basics':
        stepData.value.brandBasics = value as BrandBasicsData
        break
      case 'concept':
        stepData.value.concept = value as BrandConceptData
        break
      case 'externalNaming':
        stepData.value.externalNaming = value as BrandExternalNamingData
        break
      case 'internalNaming':
        stepData.value.internalNaming = value as BrandInternalNamingData
        break
      case 'marketingPackage':
        stepData.value.marketingPackage = value as BrandMarketingPackageData
        break
      case 'deliverables':
        stepData.value.deliverables = value as BrandDeliverablesData
        break
      case 'visualComponents':
        stepData.value.visualComponents = value as BrandVisualComponentsData
        break
    }
  }

  /**
   * Begin inline edit of a single review section. Captures a deep snapshot so
   * Скасувати can restore untouched state; sets `returnToStep` so the layout
   * knows where to come back.
   */
  function beginEditSection(key: string, fromStep: number) {
    const snapshot = getSectionStateByKey(key)
    editingSection.value = key
    editingSectionSnapshot.value =
      snapshot == null ? null : JSON.parse(JSON.stringify(snapshot))
    returnToStep.value = fromStep
  }

  /** Commit the current edits and clear the edit flag. */
  function commitEditSection() {
    editingSection.value = null
    editingSectionSnapshot.value = null
    returnToStep.value = null
  }

  /** Revert the section to its snapshot and clear the edit flag. */
  function cancelEditSection() {
    const key = editingSection.value
    if (key) {
      restoreSectionStateByKey(key, editingSectionSnapshot.value)
    }
    editingSection.value = null
    editingSectionSnapshot.value = null
    returnToStep.value = null
  }

  /**
   * Re-apply a previously persisted edit-session (key + snapshot) without
   * touching `stepData`. Used by the author-revision persistence layer to
   * restore the in-progress inline-edit state after F5 — `stepData` is
   * restored separately from the cached overlay.
   *
   * No-op when `key` is `null`.
   */
  function restoreEditingSession(key: string | null, snapshot: unknown) {
    if (!key) {
      editingSection.value = null
      editingSectionSnapshot.value = null
      return
    }
    editingSection.value = key
    editingSectionSnapshot.value = snapshot ?? null
  }

  function resetSlice() {
    editingSection.value = null
    editingSectionSnapshot.value = null
  }

  return {
    editingSection,
    editingSectionSnapshot,
    beginEditSection,
    commitEditSection,
    cancelEditSection,
    restoreEditingSession,
    // Facade-internal
    resetSlice,
  }
}

export type UseInlineSectionEditReturn = ReturnType<typeof useInlineSectionEdit>
