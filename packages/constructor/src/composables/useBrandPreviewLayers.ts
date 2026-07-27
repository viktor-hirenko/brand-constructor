import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { getAssetUrl, apiGet } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'
import { logSilent } from '@/utils/log'
import type { ComponentVariant } from '@brand-constructor/shared/types'

export interface ComponentSlot {
  left: string
  top: string
  width: string
  height: string
  zIndex: number
}

export interface PreviewLayer {
  typeId: string
  url: string
  slot: ComponentSlot
}

// Slot geometry is expressed in `rem` (design px ÷ 16) so the layered preview
// scales with the fluid root font in embedded mode — the iPhone frame itself is
// rem-sized (see iphoneVisualPreview.ts), so the stacked component images must
// use the same unit to stay pixel-aligned at any scale. Standalone keeps a 16px
// root, so `rem` resolves to the exact original px.

/** Visible iPhone status bar strip above full-height sidebar screenshots. */
export const PHONE_STATUS_BAR_INSET_REM = 2.125 // 34px

const SIDEBAR_BASE_SLOT: ComponentSlot = {
  left: '0rem',
  top: '0rem',
  width: '18.046875rem', // 288.75px
  height: '38.390625rem', // 614.25px
  zIndex: 30,
}

/**
 * Sidebar variants that start at the top of the screen (no status-bar inset).
 * TODO: move to DB field when preview layout is configurable in admin.
 */
const SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET = new Set([
  'Type 3',
  'cvr_3b35e684ab1e4d2b',
])

/** Geometry for known component types on the iPhone preview. */
export const COMPONENT_SLOTS: Record<string, ComponentSlot> = {
  ct_header: { left: '0rem', top: '2.109375rem', width: '18.140625rem', height: '3rem', zIndex: 20 },
  ct_banners: { left: '0.75rem', top: '5.109375rem', width: '17.390625rem', height: '9rem', zIndex: 19 },
  ct_thumbnails: { left: '0.75rem', top: '24.65625rem', width: '16.875rem', height: '7.875rem', zIndex: 18 },
  ct_tabbar: { left: '0rem', top: '34.828125rem', width: '18.09375rem', height: '3.5625rem', zIndex: 17 },
  ct_sidebar: SIDEBAR_BASE_SLOT,
  ct_theme: { left: '0rem', top: '0rem', width: '18.046875rem', height: '38.390625rem', zIndex: 5 },
}

function isSidebarTypeId(typeId: string): boolean {
  return typeId.includes('sidebar')
}

interface UseBrandPreviewLayersResult {
  variantsCache: ReturnType<typeof ref<Record<string, ComponentVariant[]>>>
  loadVariants: () => Promise<void>
  getPreviewUrl: (typeId: string) => string | null
  buildLayers: (hideSidebar: boolean) => PreviewLayer[]
  buildBaseLayers: () => PreviewLayer[]
  getSidebarLayer: () => PreviewLayer | null
  buildSidebarLayerForVariant: (typeId: string, variantId: string) => PreviewLayer | null
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
        const data = await apiGet<{ type: { name: string }; variants: ComponentVariant[] }>(
          `/api/components/types/${typeId}/variants?status=all`
        )
        variantsCache.value[typeId] = data.variants || []
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

  function sidebarUsesStatusBarInset(typeId: string, variantId: string): boolean {
    if (SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET.has(variantId)) return false

    const variant = variantsCache.value[typeId]?.find(v => v.id === variantId)
    if (variant && SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET.has(variant.name)) return false

    return true
  }

  function resolveSidebarSlotForVariant(typeId: string, variantId: string): ComponentSlot {
    if (!sidebarUsesStatusBarInset(typeId, variantId)) {
      return { ...SIDEBAR_BASE_SLOT }
    }

    return {
      ...SIDEBAR_BASE_SLOT,
      top: `${PHONE_STATUS_BAR_INSET_REM}rem`,
    }
  }

  function resolveSidebarSlot(typeId: string): ComponentSlot {
    const variantId = store.stepData?.visualComponents?.selections?.[typeId]
    if (!variantId) return { ...SIDEBAR_BASE_SLOT }
    return resolveSidebarSlotForVariant(typeId, variantId)
  }

  function getPreviewUrlForVariant(typeId: string, variantId: string): string | null {
    const variants = variantsCache.value[typeId] || []
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return null
    const url = variant.preview_url || variant.thumbnail_url
    if (!url) return null
    return url.startsWith('http') ? url : getAssetUrl(url)
  }

  function buildLayerForType(typeId: string): PreviewLayer | null {
    const url = getPreviewUrl(typeId)
    if (!url) return null

    const slot = isSidebarTypeId(typeId) ? resolveSidebarSlot(typeId) : COMPONENT_SLOTS[typeId]
    if (!slot) return null

    return { typeId, url, slot }
  }

  function buildLayers(hideSidebar: boolean): PreviewLayer[] {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const layers: PreviewLayer[] = []
    for (const typeId of Object.keys(selections)) {
      if (isSidebarTypeId(typeId) && hideSidebar) continue
      const layer = buildLayerForType(typeId)
      if (layer) layers.push(layer)
    }
    return layers.sort((a, b) => a.slot.zIndex - b.slot.zIndex)
  }

  function buildBaseLayers(): PreviewLayer[] {
    return buildLayers(true)
  }

  function getSidebarLayer(): PreviewLayer | null {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const sidebarTypeId = Object.keys(selections).find(isSidebarTypeId)
    if (!sidebarTypeId) return null
    return buildLayerForType(sidebarTypeId)
  }

  function buildSidebarLayerForVariant(typeId: string, variantId: string): PreviewLayer | null {
    if (!isSidebarTypeId(typeId)) return null
    const url = getPreviewUrlForVariant(typeId, variantId)
    if (!url) return null
    return {
      typeId,
      url,
      slot: resolveSidebarSlotForVariant(typeId, variantId),
    }
  }

  return {
    variantsCache,
    loadVariants,
    getPreviewUrl,
    buildLayers,
    buildBaseLayers,
    getSidebarLayer,
    buildSidebarLayerForVariant,
    hasSelections,
    hasSidebarSelected,
  }
}
