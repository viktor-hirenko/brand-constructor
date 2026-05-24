import { describe, expect, it } from 'vitest'
import { resolveColdStartNavigation } from '@/router/coldStartNavigation'

describe('resolveColdStartNavigation', () => {
  it('allows in-app navigation', () => {
    expect(
      resolveColdStartNavigation({
        fromName: 'brand-view-review',
        toMeta: { poEdit: true },
        toParamsId: 'brand-1',
        toQueryEditBrand: undefined,
      })
    ).toBe(true)
  })

  it('redirects cold start on po-edit routes', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toMeta: { poEdit: true },
        toParamsId: 'brand-42',
        toQueryEditBrand: undefined,
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-42' } })
  })

  it('redirects cold start on ceo-reselect routes', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toMeta: { ceoReselect: true },
        toParamsId: 'brand-99',
        toQueryEditBrand: undefined,
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-99' } })
  })

  it('redirects cold start wizard edit URLs marked with editBrand query', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toMeta: {},
        toParamsId: undefined,
        toQueryEditBrand: 'brand-7',
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-7' } })
  })

  it('ignores empty editBrand query on cold start', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toMeta: {},
        toParamsId: undefined,
        toQueryEditBrand: '',
      })
    ).toBe(true)
  })
})
