import { describe, it, expect } from 'vitest'
import { IPHONE_VIEWPORT } from '@/constants/iphoneVisualPreview'
import {
  PREVIEW_CANVAS,
  PREVIEW_PLACEMENT,
  getPreviewPlacement,
  resolveCanvasUnitRem,
} from '@/constants/visualPreviewLayout'

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

  it('never clips the fixed tabbar inside the current iPhone viewport', () => {
    const unit = resolveCanvasUnitRem(IPHONE_VIEWPORT.widthRem, IPHONE_VIEWPORT.heightRem)

    expect(unit * PREVIEW_CANVAS.heightPx).toBeLessThanOrEqual(IPHONE_VIEWPORT.heightRem)
  })

  it('collapses to zero for a host with no size', () => {
    expect(resolveCanvasUnitRem(0, 10)).toBe(0)
    expect(resolveCanvasUnitRem(10, 0)).toBe(0)
    expect(resolveCanvasUnitRem(-1, 10)).toBe(0)
  })
})
