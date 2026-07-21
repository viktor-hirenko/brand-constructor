import { describe, expect, it } from 'vitest'
import { resolveBrandBriefReviewPhase } from '@/domain/reviewPhase/resolveBrandBriefReviewPhase'
import { BRAND_BRIEF_REVIEW_PHASE } from '@/domain/reviewPhase/BrandBriefReviewPhase'

const base = {
  status: 'draft',
  isSupervisor: false,
  hasNewBriefs: false,
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

  it('resolves supervisor review for a submitted brief ready for CEO', () => {
    expect(
      resolveBrandBriefReviewPhase({
        ...base,
        status: 'submitted',
        isSupervisor: true,
        hasNewBriefs: false,
      })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_REVIEW)
  })

  it('resolves supervisor awaiting team when submitted brief has new orders', () => {
    expect(
      resolveBrandBriefReviewPhase({
        ...base,
        status: 'submitted',
        isSupervisor: true,
        hasNewBriefs: true,
      })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_AWAITING_TEAM)
  })

  it('resolves author in work for PO on submitted brief with new orders', () => {
    expect(
      resolveBrandBriefReviewPhase({
        ...base,
        status: 'submitted',
        hasNewBriefs: true,
      })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.AUTHOR_IN_WORK)
  })

  it('resolves author-returned for a needs_revision brief viewed by the author', () => {
    expect(
      resolveBrandBriefReviewPhase({ ...base, status: 'needs_revision' })
    ).toBe(BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED)
  })
})
