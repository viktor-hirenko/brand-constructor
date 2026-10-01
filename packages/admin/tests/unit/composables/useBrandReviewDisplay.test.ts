import { describe, expect, it } from 'vitest'
import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import type { BrandListItem } from '@brand-constructor/shared'
import {
  brandStatusTabs,
  daysInStatus,
  formatRelativeUk,
  getBrandReviewDisplay,
  getWaitingSince,
  isBriefInWork,
  waitingToneFromDays,
} from '@/composables/useBrandReviewDisplay'

function baseBrand(overrides: Partial<BrandListItem> = {}): BrandListItem {
  return {
    id: 'brand-1',
    internalName: 'Test Brand',
    status: BRAND_BRIEF_STATUS.DRAFT,
    createdBy: 'user-1',
    geo: 'AU',
    launchDate: null,
    mode: null,
    conceptId: null,
    conceptComment: null,
    externalNamingIds: [],
    externalNamingComment: null,
    internalNamingId: null,
    internalNamingComment: null,
    prPackageId: null,
    prPackageComment: null,
    legalLanding: false,
    partnerLanding: false,
    deliverablesComment: null,
    componentSelections: {},
    componentsComment: null,
    delegateToDesigners: false,
    newConceptBrief: null,
    ceoComments: null,
    ceoSelections: null,
    developmentDeadline: null,
    newNamingBrief: null,
    stepData: null,
    currentStep: 0,
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-25T10:00:00.000Z',
    authorName: 'PO User',
    authorRole: 'product_owner',
    ...overrides,
  }
}

const NOW = new Date('2026-05-28T12:00:00.000Z').getTime()

describe('waitingToneFromDays', () => {
  it('returns warn at 3 days and late at 7 days', () => {
    expect(waitingToneFromDays(2)).toBe('normal')
    expect(waitingToneFromDays(3)).toBe('warn')
    expect(waitingToneFromDays(7)).toBe('late')
  })
})

describe('getWaitingSince', () => {
  it('uses updatedAt as approx fallback for submitted without snapshot', () => {
    const since = getWaitingSince(
      baseBrand({
        status: BRAND_BRIEF_STATUS.SUBMITTED,
        submittedAt: null,
        updatedAt: '2026-05-25T10:00:00.000Z',
      })
    )
    expect(since.iso).toBe('2026-05-25T10:00:00.000Z')
    expect(since.isApprox).toBe(true)
  })
})

describe('getBrandReviewDisplay', () => {
  it('draft shows not submitted and empty waiting', () => {
    const d = getBrandReviewDisplay(baseBrand())
    expect(d.reviewLine).toBe('Not submitted')
    expect(d.waitingLine).toBe('—')
    expect(d.waitingSince).toBeNull()
  })

  it('submitted with new brief orders shows in work with team', () => {
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.SUBMITTED,
        submittedAt: '2026-05-20T10:00:00.000Z',
        newConceptBrief: { isNewGeo: true } as never,
      })
    )
    expect(d.reviewLine).toBe('In work with team')
    expect(d.reviewTitle).toContain('Teams received')
  })

  it('in_work shows in work with team, waiting since it was sent to the teams', () => {
    const brand = baseBrand({
      status: BRAND_BRIEF_STATUS.IN_WORK,
      sentToWorkAt: '2026-09-30T09:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    })
    const d = getBrandReviewDisplay(brand)
    expect(d.reviewLine).toBe('In work with team')
    expect(getWaitingSince(brand)).toEqual({ iso: '2026-09-30T09:00:00.000Z', isApprox: false })
  })

  it('in_work after the team sent the order: «Order ready», waiting since then; status untouched', () => {
    const brand = baseBrand({
      status: BRAND_BRIEF_STATUS.IN_WORK,
      sentToWorkAt: '2026-09-30T09:00:00.000Z',
      ordersReadyAt: '2026-10-01T15:00:00.000Z',
      updatedAt: '2026-10-01T16:00:00.000Z',
    })
    const d = getBrandReviewDisplay(brand)
    expect(d.reviewLine).toBe('Order ready')
    expect(d.reviewTitle).toBe('Team sent the order. Waiting for Product Owner to pick and send to CEO.')
    expect(getWaitingSince(brand)).toEqual({ iso: '2026-10-01T15:00:00.000Z', isApprox: false })
    expect(brand.status).toBe(BRAND_BRIEF_STATUS.IN_WORK)
  })

  it('in_work stays «in work» after the order was swapped for library picks', () => {
    // the order is gone from the brief, but the CEO has not received it yet
    expect(isBriefInWork(baseBrand({ status: BRAND_BRIEF_STATUS.IN_WORK }))).toBe(true)
    expect(isBriefInWork(baseBrand({ status: BRAND_BRIEF_STATUS.SUBMITTED }))).toBe(false)
  })

  it('the CEO never gets the In Work tab; everyone else does', () => {
    expect(brandStatusTabs({ isCeo: true }).map(t => t.key)).not.toContain('in_work')
    expect(brandStatusTabs({ isCeo: false }).map(t => t.key)).toContain('in_work')
  })

  it('submitted shows awaiting approval with resubmit badge', () => {
    const submittedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.SUBMITTED,
        submittedAt,
        submitCount: 2,
        submittedByName: 'PO User',
      })
    )
    expect(d.reviewLine).toBe('Awaiting approval · #2')
    expect(d.reviewTitle).toContain('CPO/CEO')
    expect(d.reviewTitle).toContain('PO User')
    expect(d.waitingLine).toContain('·')
    expect(daysInStatus(submittedAt)).toBeGreaterThanOrEqual(3)
    expect(d.waitingTone).toBe('warn')
    expect(formatRelativeUk(submittedAt)).toMatch(/\d+d/)
  })

  it('needs revision shows awaiting PO, not approver in cell', () => {
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.NEEDS_REVISION,
        needsRevisionAt: '2026-05-26T08:00:00.000Z',
        needsRevisionByName: 'Viktor Hirenko',
      })
    )
    expect(d.reviewLine).toBe('Awaiting PO')
    expect(d.reviewTitle).toContain('PO User')
    expect(d.reviewTitle).toContain('Viktor Hirenko')
    expect(d.waitingLine).toMatch(/26\.05\.2026/)
  })

  it('approved shows dash in review and name only in tooltip', () => {
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.APPROVED,
        approvedAt: '2026-05-27T15:00:00.000Z',
        approvedByName: 'Viktor Hirenko',
        submittedAt: '2026-05-20T10:00:00.000Z',
      })
    )
    expect(d.reviewLine).toBe('—')
    expect(d.reviewTitle).toContain('Viktor Hirenko')
    expect(d.waitingLine).toBe('27.05.2026')
  })

  it('marks approx waiting with tilde prefix', () => {
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.SUBMITTED,
        submittedAt: null,
        updatedAt: '2026-05-24T10:00:00.000Z',
      })
    )
    expect(d.waitingLine.startsWith('~')).toBe(true)
    expect(d.isApproxDate).toBe(true)
    expect(d.waitingTitle).toContain('estimated')
  })
})
