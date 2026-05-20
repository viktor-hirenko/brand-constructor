import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { getAssetUrl, getAuthHeader } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'
import { logSilent } from '@/utils/log'
import type { ComponentVariant } from '@brand-constructor/shared/types'

export interface ComponentSlot {
  left: string
  top: string
  width: string
  height: string
  zIndex: number
  contain?: boolean
}

export interface PreviewLayer {
  typeId: string
  url: string
  slot: ComponentSlot
}

/** Geometry for known component types on the iPhone preview. */
export const COMPONENT_SLOTS: Record<string, ComponentSlot> = {
  ct_header: { left: '0px', top: '33.75px', width: '290.25px', height: '48px', zIndex: 20 },
  ct_banners: { left: '12px', top: '81.75px', width: '278.25px', height: '144px', zIndex: 19 },
  ct_thumbnails: { left: '12px', top: '394.5px', width: '270px', height: '126px', zIndex: 18 },
  ct_tabbar: { left: '0px', top: '557.25px', width: '289.5px', height: '57px', zIndex: 17 },
  ct_sidebar: {
    left: '0px',
    top: '0px',
    width: '288.75px',
    height: '614.25px',
    zIndex: 30,
    contain: true,
  },
  ct_theme: { left: '0px', top: '0px', width: '288.75px', height: '614.25px', zIndex: 5 },
}

interface UseBrandPreviewLayersResult {
  variantsCache: ReturnType<typeof ref<Record<string, ComponentVariant[]>>>
  loadVariants: () => Promise<void>
  getPreviewUrl: (typeId: string) => string | null
  buildLayers: (hideSidebar: boolean) => PreviewLayer[]
  hasSelections: ComputedRef<boolean>
  hasSidebarSelected: ComputedRef<boolean>
}

/**
 * Encapsulates loading visual-component variants and turning the active
 * `selections` map from the constructor store into z-ordered layers ready to
 * stack on top of an iPhone mockup.
 *
 * Reused by ConstructorLayout (Step 8/9 right panel) and BrandPreviewPanel
 * (CEO finalize right column).
 */
export function useBrandPreviewLayers(): UseBrandPreviewLayersResult {
  const store = useConstructorStore()
  const variantsCache = ref<Record<string, ComponentVariant[]>>({})

  const hasSelections = computed(() => {
    return Object.keys(store.stepData?.visualComponents?.selections ?? {}).length > 0
  })

  const hasSidebarSelected = computed(() => {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    return Object.keys(selections).some(id => id.includes('sidebar'))
  })

  async function loadVariants() {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const typeIds = Object.keys(selections)
    if (typeIds.length === 0) return

    for (const typeId of typeIds) {
      if (variantsCache.value[typeId]) continue
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/components/types/${typeId}/variants?status=all`,
          { headers: getAuthHeader() }
        )
        if (res.ok) {
          const json = await res.json()
          variantsCache.value[typeId] = json.data?.variants || []
        }
      } catch (err) {
        logSilent('useBrandPreviewLayers/fetchVariants', err)
      }
    }
  }

  function getPreviewUrl(typeId: string): string | null {
    const variantId = store.stepData?.visualComponents?.selections?.[typeId]
    if (!variantId) return null
    const variants = variantsCache.value[typeId] || []
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return null
    const url = variant.preview_url || variant.thumbnail_url
    if (!url) return null
    return url.startsWith('http') ? url : getAssetUrl(url)
  }

  function buildLayers(hideSidebar: boolean): PreviewLayer[] {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const layers: PreviewLayer[] = []
    for (const typeId of Object.keys(selections)) {
      if (typeId.includes('sidebar') && hideSidebar) continue
      const slot = COMPONENT_SLOTS[typeId]
      const url = getPreviewUrl(typeId)
      if (slot && url) {
        layers.push({ typeId, url, slot })
      }
    }
    return layers.sort((a, b) => a.slot.zIndex - b.slot.zIndex)
  }

  return {
    variantsCache,
    loadVariants,
    getPreviewUrl,
    buildLayers,
    hasSelections,
    hasSidebarSelected,
  }
}
