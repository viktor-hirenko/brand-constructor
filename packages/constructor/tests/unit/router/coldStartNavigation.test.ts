import { describe, expect, it } from 'vitest'
import { resolveColdStartNavigation } from '@/router/coldStartNavigation'

describe('resolveColdStartNavigation', () => {
  it('allows in-app navigation', () => {
    expect(
      resolveColdStartNavigation({
        fromName: 'brand-view-review',
        toQueryEditBrand: undefined,
      })
    ).toBe(true)
  })

  it('keeps cold-start navigation to brief review sub-routes (drafts are restored from storage)', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toQueryEditBrand: undefined,
      })
    ).toBe(true)
  })

  it('redirects cold start wizard edit URLs marked with editBrand query', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toQueryEditBrand: 'brand-7',
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-7' } })
  })

  it('ignores empty editBrand query on cold start', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toQueryEditBrand: '',
      })
    ).toBe(true)
  })
})
