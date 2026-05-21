import { ref } from 'vue'
import { apiGet } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'
import { logSilent } from '@/utils/log'

export interface ComponentSelectionInfo {
  typeName: string
  variantName: string
}

export type ComponentSelectionDetails = Record<string, ComponentSelectionInfo>

interface ComponentVariantsResponse {
  type: { name: string }
  variants: Array<{ id: string; name: string }>
}

/**
 * Resolves the user-friendly `(typeName, variantName)` pair for each
 * `(typeId → variantId)` entry currently stored in
 * `store.stepData.visualComponents.selections`.
 *
 * Used by the Brand Brief review screen (both the unified and legacy views)
 * to render the final "Visual Components" summary. Failures are reported via
 * `logSilent` and the affected entries fall back to the raw ids — preserving
 * the previous inline behaviour from `ReviewSubmitView.vue`.
 */
export function useReviewComponentSelections() {
  const store = useConstructorStore()
  const componentSelectionDetails = ref<ComponentSelectionDetails>({})

  async function loadComponentSelectionDetails(): Promise<void> {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    if (Object.keys(selections).length === 0) return

    const result: ComponentSelectionDetails = {}
    const promises = Object.entries(selections).map(async ([typeId, variantId]) => {
      try {
        const data = await apiGet<ComponentVariantsResponse>(
          `/api/components/types/${typeId}/variants?status=all`
        )
        const typeName = data.type?.name ?? typeId
        const variants = data.variants || []
        const variant = variants.find(v => v.id === variantId)
        result[typeId] = { typeName, variantName: variant?.name ?? variantId }
      } catch (err) {
        logSilent('useReviewComponentSelections/load', err)
        result[typeId] = { typeName: typeId, variantName: variantId }
      }
    })
    await Promise.all(promises)
    componentSelectionDetails.value = result
  }

  return { componentSelectionDetails, loadComponentSelectionDetails }
}
