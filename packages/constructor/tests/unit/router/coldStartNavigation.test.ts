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

  it('keeps cold-start navigation to the review and the CEO screens', () => {
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

  it('redirects cold start on a draft-edit cascade route to the brand review', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toIsDraftEdit: true,
        toParamsId: 'brand-9',
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-9' } })
  })

  it('keeps in-app navigation on a draft-edit route (session is still in memory)', () => {
    expect(
      resolveColdStartNavigation({
        fromName: 'draft-edit-concept',
        toIsDraftEdit: true,
        toParamsId: 'brand-9',
      })
    ).toBe(true)
  })

  it('redirects cold start on a revision edit screen to the brand review (H-03, D-07)', () => {
    expect(
      resolveColdStartNavigation({
        fromName: undefined,
        toIsPoEdit: true,
        toParamsId: 'brand-9',
      })
    ).toEqual({ name: 'brand-view-review', params: { id: 'brand-9' } })
  })
})
