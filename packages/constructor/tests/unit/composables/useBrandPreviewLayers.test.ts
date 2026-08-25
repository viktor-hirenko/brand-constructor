import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentVariant } from '@brand-constructor/shared/types'

const mockStore = {
  stepData: {
    visualComponents: {
      selections: {} as Record<string, string>,
      delegateToDesigners: false,
    },
  },
}

vi.mock('@/stores/constructor', () => ({
  useConstructorStore: () => mockStore,
}))

vi.mock('@/composables/useApi', () => ({
  apiGet: vi.fn(),
  getAssetUrl: (url: string) => `https://assets.test${url}`,
}))

import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'

function variant(id: string, typeId: string, overrides: Partial<ComponentVariant> = {}): ComponentVariant {
  return {
    id,
    component_type_id: typeId,
    name: 'Type A',
    variant_number: 1,
    thumbnail_url: null,
    preview_url: `/api/assets/${id}.png`,
    status: 'active',
    created_by: 'usr_test',
    used_in_brand_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as ComponentVariant
}

/** Wires selections and the variant cache the way `loadVariants` would. */
function createPreview(
  selections: Record<string, string>,
  variants: Record<string, ComponentVariant[]>,
) {
  mockStore.stepData.visualComponents.selections = selections
  const preview = useBrandPreviewLayers()
  preview.variantsCache.value = variants
  return preview
}

describe('useBrandPreviewLayers — buildComposition', () => {
  beforeEach(() => {
    mockStore.stepData.visualComponents.selections = {}
    mockStore.stepData.visualComponents.delegateToDesigners = false
  })

  it('pins the header on top, the tabbar at the bottom and scrolls the rest', () => {
    const preview = createPreview(
      {
        ct_header: 'cvr_header',
        ct_banners: 'cvr_banners',
        ct_thumbnails: 'cvr_thumbnails',
        ct_tabbar: 'cvr_tabbar',
      },
      {
        ct_header: [variant('cvr_header', 'ct_header')],
        ct_banners: [variant('cvr_banners', 'ct_banners')],
        ct_thumbnails: [variant('cvr_thumbnails', 'ct_thumbnails')],
        ct_tabbar: [variant('cvr_tabbar', 'ct_tabbar')],
      },
    )

    const composition = preview.buildComposition()

    expect(composition.top?.typeId).toBe('ct_header')
    expect(composition.bottom?.typeId).toBe('ct_tabbar')
    expect(composition.body.map(slice => slice.typeId)).toEqual(['ct_banners', 'ct_thumbnails'])
  })

  it('orders the body by placement, not by selection order', () => {
    const preview = createPreview(
      { ct_thumbnails: 'cvr_thumbnails', ct_banners: 'cvr_banners' },
      {
        ct_thumbnails: [variant('cvr_thumbnails', 'ct_thumbnails')],
        ct_banners: [variant('cvr_banners', 'ct_banners')],
      },
    )

    expect(preview.buildComposition().body.map(slice => slice.typeId)).toEqual([
      'ct_banners',
      'ct_thumbnails',
    ])
  })

  it('returns an empty composition when nothing is selected', () => {
    const preview = createPreview({}, {})

    expect(preview.buildComposition()).toEqual({ top: null, body: [], bottom: null, overlay: null })
    expect(preview.hasSelections.value).toBe(false)
  })

  it('renders nothing when the choice is delegated to designers, stale selections included', () => {
    const preview = createPreview(
      { ct_header: 'cvr_header' },
      { ct_header: [variant('cvr_header', 'ct_header')] },
    )
    mockStore.stepData.visualComponents.delegateToDesigners = true

    expect(preview.buildComposition()).toEqual({ top: null, body: [], bottom: null, overlay: null })
    expect(preview.hasSelections.value).toBe(false)
    expect(preview.hasSidebarSelected.value).toBe(false)
  })

  it('skips a variant that has neither preview nor thumbnail', () => {
    const preview = createPreview(
      { ct_header: 'cvr_header', ct_tabbar: 'cvr_tabbar' },
      {
        ct_header: [variant('cvr_header', 'ct_header', { preview_url: null, thumbnail_url: null })],
        ct_tabbar: [variant('cvr_tabbar', 'ct_tabbar')],
      },
    )

    const composition = preview.buildComposition()

    expect(composition.top).toBeNull()
    expect(composition.bottom?.typeId).toBe('ct_tabbar')
  })

  it('falls back to the thumbnail when there is no preview', () => {
    const preview = createPreview(
      { ct_header: 'cvr_header' },
      {
        ct_header: [
          variant('cvr_header', 'ct_header', {
            preview_url: null,
            thumbnail_url: '/api/assets/thumb.png',
          }),
        ],
      },
    )

    expect(preview.buildComposition().top?.url).toBe('https://assets.test/api/assets/thumb.png')
  })

  it('leaves absolute urls untouched', () => {
    const preview = createPreview(
      { ct_header: 'cvr_header' },
      {
        ct_header: [
          variant('cvr_header', 'ct_header', { preview_url: 'https://cdn.test/header.png' }),
        ],
      },
    )

    expect(preview.buildComposition().top?.url).toBe('https://cdn.test/header.png')
  })

  it('skips a selected type that has no place on the screen', () => {
    const preview = createPreview(
      { ct_theme: 'cvr_theme', ct_header: 'cvr_header' },
      {
        ct_theme: [variant('cvr_theme', 'ct_theme')],
        ct_header: [variant('cvr_header', 'ct_header')],
      },
    )

    const composition = preview.buildComposition()

    expect(composition.top?.typeId).toBe('ct_header')
    expect(composition.body).toEqual([])
    expect(composition.overlay).toBeNull()
  })

  it('skips a selection whose variant is missing from the cache', () => {
    const preview = createPreview({ ct_header: 'cvr_unknown' }, { ct_header: [] })

    expect(preview.buildComposition().top).toBeNull()
  })
})

describe('useBrandPreviewLayers — overlay', () => {
  beforeEach(() => {
    mockStore.stepData.visualComponents.selections = {}
    mockStore.stepData.visualComponents.delegateToDesigners = false
  })

  it('exposes the sidebar as the overlay and can leave it out', () => {
    const preview = createPreview(
      { ct_sidebar: 'cvr_sidebar' },
      { ct_sidebar: [variant('cvr_sidebar', 'ct_sidebar')] },
    )

    expect(preview.buildComposition().overlay?.typeId).toBe('ct_sidebar')
    expect(preview.buildComposition(false).overlay).toBeNull()
    expect(preview.getOverlaySlice()?.typeId).toBe('ct_sidebar')
    expect(preview.hasSidebarSelected.value).toBe(true)
  })

  it('builds a pinned overlay slice for a variant that is no longer selected', () => {
    const preview = createPreview({}, { ct_sidebar: [variant('cvr_sidebar', 'ct_sidebar')] })

    expect(preview.buildOverlaySliceForVariant('ct_sidebar', 'cvr_sidebar')).toEqual({
      typeId: 'ct_sidebar',
      url: 'https://assets.test/api/assets/cvr_sidebar.png',
    })
  })

  it('refuses to pin a type that does not belong on the overlay', () => {
    const preview = createPreview({}, { ct_header: [variant('cvr_header', 'ct_header')] })

    expect(preview.buildOverlaySliceForVariant('ct_header', 'cvr_header')).toBeNull()
  })
})
