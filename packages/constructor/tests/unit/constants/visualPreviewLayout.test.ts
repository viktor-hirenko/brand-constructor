import { describe, it, expect } from 'vitest'
import { COMPONENT_TYPE_ASPECT_RATIOS } from '@brand-constructor/shared/constants'
import {
  PREVIEW_CANVAS,
  PREVIEW_PHONE_BOX,
  PREVIEW_PLACEMENT,
  PREVIEW_SIDEBAR_BANDS,
  getPreviewPlacement,
  resolveCanvasUnitRem,
  resolveSidebarBandGeometry,
} from '@/constants/visualPreviewLayout'

/** Height the sidebar slice renders at, derived the way the browser derives it. */
const SIDEBAR_SLICE_HEIGHT_PX =
  PREVIEW_CANVAS.widthPx / COMPONENT_TYPE_ASPECT_RATIOS.ct_sidebar.aspect_ratio

describe('PREVIEW_CANVAS', () => {
  it('splits the canvas height into chassis strips and content area', () => {
    expect(PREVIEW_CANVAS.statusBarPx + PREVIEW_CANVAS.contentHeightPx + PREVIEW_CANVAS.homeIndicatorPx).toBe(
      PREVIEW_CANVAS.heightPx,
    )
  })
})

describe('getPreviewPlacement', () => {
  it('pins the header to the top and the tabbar to the bottom', () => {
    expect(getPreviewPlacement('ct_header')?.placement).toBe('top-fixed')
    expect(getPreviewPlacement('ct_tabbar')?.placement).toBe('bottom-fixed')
  })

  it('scrolls banners and thumbnails, in that order', () => {
    const banners = getPreviewPlacement('ct_banners')
    const thumbnails = getPreviewPlacement('ct_thumbnails')

    expect(banners?.placement).toBe('body')
    expect(thumbnails?.placement).toBe('body')
    expect(banners!.order).toBeLessThan(thumbnails!.order)
  })

  it('puts the sidebar on the overlay', () => {
    expect(getPreviewPlacement('ct_sidebar')?.placement).toBe('overlay')
  })

  it('returns null for a type with no place on the screen', () => {
    expect(getPreviewPlacement('ct_theme')).toBeNull()
    expect(getPreviewPlacement('ct_not_a_real_type')).toBeNull()
  })

  it('keeps body order free of ties', () => {
    const bodyOrders = Object.values(PREVIEW_PLACEMENT)
      .filter(entry => entry.placement === 'body')
      .map(entry => entry.order)

    expect(new Set(bodyOrders).size).toBe(bodyOrders.length)
  })
})

describe('resolveCanvasUnitRem', () => {
  it('resolves one design px to one host px when the host matches the canvas', () => {
    const unit = resolveCanvasUnitRem(PREVIEW_CANVAS.widthPx / 16, PREVIEW_CANVAS.heightPx / 16)

    expect(unit).toBeCloseTo(1 / 16, 10)
  })

  it('fits inside the host instead of overflowing it', () => {
    const hostWidthRem = 10
    const hostHeightRem = 5
    const unit = resolveCanvasUnitRem(hostWidthRem, hostHeightRem)

    expect(unit * PREVIEW_CANVAS.widthPx).toBeLessThanOrEqual(hostWidthRem)
    expect(unit * PREVIEW_CANVAS.heightPx).toBeLessThanOrEqual(hostHeightRem)
  })

  it('never clips the fixed tabbar at the on-screen phone size', () => {
    const unit = resolveCanvasUnitRem(PREVIEW_PHONE_BOX.widthRem, PREVIEW_PHONE_BOX.heightRem)

    expect(unit * PREVIEW_CANVAS.heightPx).toBeLessThanOrEqual(PREVIEW_PHONE_BOX.heightRem)
  })

  it('collapses to zero for a host with no size', () => {
    expect(resolveCanvasUnitRem(0, 10)).toBe(0)
    expect(resolveCanvasUnitRem(10, 0)).toBe(0)
    expect(resolveCanvasUnitRem(-1, 10)).toBe(0)
  })
})

describe('PREVIEW_SIDEBAR_BANDS', () => {
  it('is the Figma metadata of node 5194:60779, not a rounded guess', () => {
    // popup/info title height and time-slot height, from get_metadata.
    // Rounding to 55/34 would silently shift "Menu ×" and "Casino Time".
    expect(PREVIEW_SIDEBAR_BANDS).toEqual({
      topPx: 54.68086242675781,
      bottomPx: 34.340431213378906,
    })
  })

  it('leaves the sidebar something to scroll', () => {
    const pinned = PREVIEW_SIDEBAR_BANDS.topPx + PREVIEW_SIDEBAR_BANDS.bottomPx
    const scrollPortPx = PREVIEW_CANVAS.contentHeightPx - pinned
    const scrollContentPx = SIDEBAR_SLICE_HEIGHT_PX - pinned

    expect(scrollPortPx).toBeGreaterThan(0)
    expect(scrollContentPx).toBeGreaterThan(scrollPortPx)
  })

  it('keeps both pinned strips inside the slice', () => {
    expect(PREVIEW_SIDEBAR_BANDS.topPx).toBeGreaterThan(0)
    expect(PREVIEW_SIDEBAR_BANDS.bottomPx).toBeGreaterThan(0)
    expect(PREVIEW_SIDEBAR_BANDS.topPx + PREVIEW_SIDEBAR_BANDS.bottomPx).toBeLessThan(
      SIDEBAR_SLICE_HEIGHT_PX,
    )
  })
})

describe('resolveSidebarBandGeometry', () => {
  it('scales the pinned strips by the canvas multiplier', () => {
    const geometry = resolveSidebarBandGeometry(1 / 16)

    expect(geometry.topHeightRem).toBe(`${PREVIEW_SIDEBAR_BANDS.topPx / 16}rem`)
    expect(geometry.bottomHeightRem).toBe(`${PREVIEW_SIDEBAR_BANDS.bottomPx / 16}rem`)
  })

  it('pulls the middle out from under both strips, not into them', () => {
    const unitRem = 1 / 16
    const geometry = resolveSidebarBandGeometry(unitRem)

    expect(parseFloat(geometry.middleMarginTopRem)).toBeCloseTo(
      -PREVIEW_SIDEBAR_BANDS.topPx * unitRem,
      10,
    )
    expect(parseFloat(geometry.middleMarginBottomRem)).toBeCloseTo(
      -PREVIEW_SIDEBAR_BANDS.bottomPx * unitRem,
      10,
    )
  })

  it('collapses with the canvas when the host has no size', () => {
    const geometry = resolveSidebarBandGeometry(0)

    expect(parseFloat(geometry.topHeightRem)).toBe(0)
    expect(parseFloat(geometry.bottomHeightRem)).toBe(0)
    expect(parseFloat(geometry.middleMarginTopRem)).toBe(0)
    expect(parseFloat(geometry.middleMarginBottomRem)).toBe(0)
  })
})
