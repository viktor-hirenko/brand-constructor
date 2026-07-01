import { describe, expect, it } from 'vitest'
import { resolveBrandBriefReviewPhase } from '@/domain/reviewPhase/resolveBrandBriefReviewPhase'
import { BRAND_BRIEF_REVIEW_PHASE } from '@/domain/reviewPhase/BrandBriefReviewPhase'

const base = {
  status: 'draft',
  isSupervisor: false,
  routeIsCeoReselect: false,
  routeIsPoEdit: false,
  routeIsDraftEdit: false,
  routeStep: 8 as number | undefined,
}

describe('resolveBrandBriefReviewPhase', () => {
  it('maps ceo-reselect routes to ALTERNATIVE_SELECTION', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, routeIsCeoReselect: true })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.ALTERNATIVE_SELECTION)
  })

  it('maps po-edit routes to REVISION_RESPONSE', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, routeIsPoEdit: true })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE)
  })

  it('maps draft-edit routes to REVISION_RESPONSE (shared edit-flow layout)', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, routeIsDraftEdit: true })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE)
  })

  it('draft-edit takes precedence over the step-8 draft review phase', () => {
    // Same status/role as a plain draft review, but the draft-edit meta flag
    // must win so the edit-flow layout + preview machinery activates.
    const plain = resolveBrandBriefReviewPhase(base)
    expect(plain).toBe(BRAND_BRIEF_REVIEW_PHASE.AUTHOR_DRAFT)
    expect(
      resolveBrandBriefReviewPhase({ ...base, routeIsDraftEdit: true })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE)
  })

  it('falls back to WIZARD on non-step-8 routes', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, routeStep: 3 })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.WIZARD)
  })

  it('resolves supervisor review for a submitted brief', () => {
    expect(
      resolveBrandBriefReviewPhase({
        ...base,
        status: 'submitted',
        isSupervisor: true,
      })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_REVIEW)
  })

  it('resolves author-returned for a needs_revision brief viewed by the author', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, status: 'needs_revision' })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED)
  })
})
