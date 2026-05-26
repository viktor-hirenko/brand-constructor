import { BRAND_BRIEF_STATUS, ROLE_LABELS } from '@brand-constructor/shared'
import type { BrandListItem } from '@brand-constructor/shared'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface BrandReviewLabel {
  primary: string
  secondary: string | null
}

export function formatAuthorRole(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function getBrandReviewLabel(brand: BrandListItem): BrandReviewLabel {
  switch (brand.status) {
    case BRAND_BRIEF_STATUS.DRAFT:
      return { primary: 'Not submitted', secondary: null }
    case BRAND_BRIEF_STATUS.SUBMITTED: {
      const since = brand.submittedAt ? formatDate(brand.submittedAt) : null
      const secondary =
        since && (brand.submitCount ?? 0) > 1 ? `Resubmit #${brand.submitCount} · ${since}` : null
      return {
        primary: since ? `Waiting CEO · since ${since}` : 'Waiting CEO',
        secondary,
      }
    }
    case BRAND_BRIEF_STATUS.NEEDS_REVISION: {
      const by = brand.needsRevisionByName ?? 'CEO'
      const at = brand.needsRevisionAt ? formatDate(brand.needsRevisionAt) : null
      const primary = at ? `Sent back by ${by} · ${at}` : `Sent back by ${by}`
      const resubmitted =
        brand.submittedAt && brand.needsRevisionAt && brand.submittedAt > brand.needsRevisionAt
          ? `Resubmitted ${formatDate(brand.submittedAt)}`
          : null
      return { primary, secondary: resubmitted }
    }
    case BRAND_BRIEF_STATUS.APPROVED: {
      const by = brand.approvedByName ?? 'CEO'
      const at = brand.approvedAt ? formatDate(brand.approvedAt) : null
      const primary = at ? `Approved by ${by} · ${at}` : `Approved by ${by}`
      const secondary =
        brand.submittedAt && brand.approvedAt
          ? `Submitted ${formatDate(brand.submittedAt)} → approved ${formatDate(brand.approvedAt)}`
          : null
      return { primary, secondary }
    }
    default:
      return { primary: brand.status, secondary: null }
  }
}
