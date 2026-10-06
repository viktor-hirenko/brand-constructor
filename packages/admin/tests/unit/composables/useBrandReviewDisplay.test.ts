import { describe, expect, it } from 'vitest'
import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import type { BrandListItem } from '@brand-constructor/shared'
import {
  brandStatusTabs,
  daysInStatus,
  formatRelativeUk,
  getBrandReviewDisplay,
  getWaitingSince,
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
    expect(d.reviewLine).toBe('Не надіслано')
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
    expect(d.reviewTitle).toContain('Команди отримали')
  })

  it('the CEO never gets the Drafts tab; everyone else does (H-37)', () => {
    expect(brandStatusTabs({ isCeo: true }).map(t => t.key)).toEqual([
      'all',
      'submitted',
      'approved',
      'needs_revision',
    ])
    expect(brandStatusTabs({ isCeo: false }).map(t => t.key)).toEqual([
      'all',
      'draft',
      'submitted',
      'approved',
      'needs_revision',
    ])
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
    expect(d.reviewLine).toBe('Очікує погодження · #2')
    expect(d.reviewTitle).toContain('CPO/CEO')
    expect(d.reviewTitle).toContain('PO User')
    expect(d.waitingLine).toContain('·')
    expect(daysInStatus(submittedAt)).toBeGreaterThanOrEqual(3)
    expect(d.waitingTone).toBe('warn')
    expect(formatRelativeUk(submittedAt)).toMatch(/\d+ дн\./)
  })

  it('needs revision shows awaiting PO, not approver in cell', () => {
    const d = getBrandReviewDisplay(
      baseBrand({
        status: BRAND_BRIEF_STATUS.NEEDS_REVISION,
        needsRevisionAt: '2026-05-26T08:00:00.000Z',
        needsRevisionByName: 'Viktor Hirenko',
      })
    )
    expect(d.reviewLine).toBe('Очікує PO')
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
    expect(d.waitingTitle).toContain('приблизна')
  })
})
