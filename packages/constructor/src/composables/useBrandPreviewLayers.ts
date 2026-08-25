import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { getAssetUrl, apiGet } from '@/composables/useApi'
import { getPreviewPlacement } from '@/constants/visualPreviewLayout'
import { useConstructorStore } from '@/stores/constructor'
import { logSilent } from '@/utils/log'
import type { ComponentVariant } from '@brand-constructor/shared/types'

/** One library slice ready to render: the picture and the type it came from. */
export interface PreviewSlice {
  typeId: string
  url: string
}

/**
 * The phone screen as a structure rather than a pile of coordinates: what is
 * pinned to the top, what scrolls in between, what is pinned to the bottom, and
 * what covers the screen. See `constants/visualPreviewLayout.ts`.
 */
export interface PreviewComposition {
  top: PreviewSlice | null
  body: PreviewSlice[]
  bottom: PreviewSlice | null
  overlay: PreviewSlice | null
}

function isSidebarTypeId(typeId: string): boolean {
  return typeId.includes('sidebar')
}

interface UseBrandPreviewLayersResult {
  variantsCache: ReturnType<typeof ref<Record<string, ComponentVariant[]>>>
  loadVariants: () => Promise<void>
  getPreviewUrl: (typeId: string) => string | null
  buildComposition: (includeOverlay?: boolean) => PreviewComposition
  getOverlaySlice: () => PreviewSlice | null
  buildOverlaySliceForVariant: (typeId: string, variantId: string) => PreviewSlice | null
  hasSelections: ComputedRef<boolean>
  hasSidebarSelected: ComputedRef<boolean>
}

/**
 * Encapsulates loading visual-component variants and turning the active
 * `selections` map from the constructor store into a phone-screen composition.
 *
 * Reused by BriefShellView (step 7 right panel) and BrandPreviewPanel (step 8
 * review right column) — one composition feeding one renderer on both screens.
 */
export function useBrandPreviewLayers(): UseBrandPreviewLayersResult {
  const store = useConstructorStore()
  const variantsCache = ref<Record<string, ComponentVariant[]>>({})

  const isDelegated = computed(() =>
    Boolean(store.stepData?.visualComponents?.delegateToDesigners)
  )

  /**
   * Delegating to designers wins over whatever is still in `selections`: the
   * modal clears the map, but a brand hydrated from the API can arrive with the
   * flag and stale selections at once.
   */
  const hasSelections = computed(() => {
    if (isDelegated.value) return false
    return Object.keys(store.stepData?.visualComponents?.selections ?? {}).length > 0
  })

  const hasSidebarSelected = computed(() => {
    if (isDelegated.value) return false
    const selections = store.stepData?.visualComponents?.selections ?? {}
    return Object.keys(selections).some(isSidebarTypeId)
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

  function getPreviewUrlForVariant(typeId: string, variantId: string): string | null {
    const variants = variantsCache.value[typeId] || []
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return null
    const url = variant.preview_url || variant.thumbnail_url
    if (!url) return null
    return url.startsWith('http') ? url : getAssetUrl(url)
  }

  function getPreviewUrl(typeId: string): string | null {
    const variantId = store.stepData?.visualComponents?.selections?.[typeId]
    if (!variantId) return null
    return getPreviewUrlForVariant(typeId, variantId)
  }

  function buildSlice(typeId: string): PreviewSlice | null {
    const url = getPreviewUrl(typeId)
    if (!url) return null
    return { typeId, url }
  }

  function buildComposition(includeOverlay = true): PreviewComposition {
    const composition: PreviewComposition = { top: null, body: [], bottom: null, overlay: null }
    if (isDelegated.value) return composition

    const selections = store.stepData?.visualComponents?.selections ?? {}
    const bodyEntries: Array<{ order: number; slice: PreviewSlice }> = []

    for (const typeId of Object.keys(selections)) {
      const placement = getPreviewPlacement(typeId)
      if (!placement) continue

      const slice = buildSlice(typeId)
      if (!slice) continue

      switch (placement.placement) {
        case 'top-fixed':
          composition.top = slice
          break
        case 'bottom-fixed':
          composition.bottom = slice
          break
        case 'overlay':
          if (includeOverlay) composition.overlay = slice
          break
        case 'body':
          bodyEntries.push({ order: placement.order, slice })
          break
      }
    }

    composition.body = bodyEntries.sort((a, b) => a.order - b.order).map(entry => entry.slice)
    return composition
  }

  function getOverlaySlice(): PreviewSlice | null {
    return buildComposition().overlay
  }

  function buildOverlaySliceForVariant(typeId: string, variantId: string): PreviewSlice | null {
    if (getPreviewPlacement(typeId)?.placement !== 'overlay') return null
    const url = getPreviewUrlForVariant(typeId, variantId)
    if (!url) return null
    return { typeId, url }
  }

  return {
    variantsCache,
    loadVariants,
    getPreviewUrl,
    buildComposition,
    getOverlaySlice,
    buildOverlaySliceForVariant,
    hasSelections,
    hasSidebarSelected,
  }
}
