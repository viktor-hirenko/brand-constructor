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

/*
 * DEPRECATED — everything from here to `isSidebarTypeId` is the pre-UXUI-2554
 * coordinate model, kept alive for step 8 only (`BrandPreviewPanel.vue`). It
 * dies with phase 5, when step 8 moves onto `PhonePreviewCanvas`. Do not wire
 * new callers into it.
 *
 * Slot geometry is expressed in `rem` (design px ÷ 16) so the layered preview
 * scales with the fluid root font in embedded mode.
 */

/** Visible iPhone status bar strip above full-height sidebar screenshots. */
const PHONE_STATUS_BAR_INSET_REM = 2.125 // 34px

const SIDEBAR_BASE_SLOT: ComponentSlot = {
  left: '0rem',
  top: '0rem',
  width: '18.046875rem', // 288.75px
  height: '38.390625rem', // 614.25px
  zIndex: 30,
}

/** Sidebar variants that start at the top of the screen (no status-bar inset). */
const SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET = new Set([
  'Type 3',
  'cvr_3b35e684ab1e4d2b',
])

const COMPONENT_SLOTS: Record<string, ComponentSlot> = {
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
  buildComposition: (includeOverlay?: boolean) => PreviewComposition
  getOverlaySlice: () => PreviewSlice | null
  buildOverlaySliceForVariant: (typeId: string, variantId: string) => PreviewSlice | null
  /** @deprecated Step 8 only until phase 5 of UXUI-2554. */
  buildLayers: (hideSidebar: boolean) => PreviewLayer[]
  hasSelections: ComputedRef<boolean>
  hasSidebarSelected: ComputedRef<boolean>
}

/**
 * Encapsulates loading visual-component variants and turning the active
 * `selections` map from the constructor store into a phone-screen composition.
 *
 * Reused by BriefShellView (step 7 right panel) and BrandPreviewPanel
 * (CEO finalize right column, still on the deprecated coordinate path).
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

  // ─── Deprecated coordinate path (step 8 only, removed in phase 5) ──────────

  function sidebarUsesStatusBarInset(typeId: string, variantId: string): boolean {
    if (SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET.has(variantId)) return false

    const variant = variantsCache.value[typeId]?.find(v => v.id === variantId)
    if (variant && SIDEBAR_VARIANTS_WITHOUT_STATUS_BAR_INSET.has(variant.name)) return false

    return true
  }

  function resolveSidebarSlot(typeId: string): ComponentSlot {
    const variantId = store.stepData?.visualComponents?.selections?.[typeId]
    if (!variantId || !sidebarUsesStatusBarInset(typeId, variantId)) {
      return { ...SIDEBAR_BASE_SLOT }
    }

    return { ...SIDEBAR_BASE_SLOT, top: `${PHONE_STATUS_BAR_INSET_REM}rem` }
  }

  function buildLayers(hideSidebar: boolean): PreviewLayer[] {
    const selections = store.stepData?.visualComponents?.selections ?? {}
    const layers: PreviewLayer[] = []

    for (const typeId of Object.keys(selections)) {
      if (isSidebarTypeId(typeId) && hideSidebar) continue

      const url = getPreviewUrl(typeId)
      if (!url) continue

      const slot = isSidebarTypeId(typeId) ? resolveSidebarSlot(typeId) : COMPONENT_SLOTS[typeId]
      if (!slot) continue

      layers.push({ typeId, url, slot })
    }

    return layers.sort((a, b) => a.slot.zIndex - b.slot.zIndex)
  }

  return {
    variantsCache,
    loadVariants,
    getPreviewUrl,
    buildComposition,
    getOverlaySlice,
    buildOverlaySliceForVariant,
    buildLayers,
    hasSelections,
    hasSidebarSelected,
  }
}
