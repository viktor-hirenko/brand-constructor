import { BRAND_BRIEF_STATUS, ROLE_LABELS } from '@brand-constructor/shared'
import type { BrandListItem } from '@brand-constructor/shared'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface BrandReviewLabel {
  /** Compact single line for the table cell */
  line: string
  /** Full text for hover tooltip; null when same as line */
  title: string | null
}

export function formatAuthorRole(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function getBrandReviewLabel(brand: BrandListItem): BrandReviewLabel {
  switch (brand.status) {
    case BRAND_BRIEF_STATUS.DRAFT:
      return { line: 'Not submitted', title: null }
    case BRAND_BRIEF_STATUS.SUBMITTED: {
      const since = brand.submittedAt ? formatDate(brand.submittedAt) : null
      const line = since ? `Waiting CEO · ${since}` : 'Waiting CEO'
      const resubmit =
        since && (brand.submitCount ?? 0) > 1 ? `Resubmit #${brand.submitCount}` : null
      const title = resubmit ? `${line}. ${resubmit}` : null
      return { line, title }
    }
    case BRAND_BRIEF_STATUS.NEEDS_REVISION: {
      const by = brand.needsRevisionByName ?? 'CEO'
      const at = brand.needsRevisionAt ? formatDate(brand.needsRevisionAt) : null
      const line = at ? `Sent back · ${at}` : 'Sent back'
      const full = at ? `Sent back by ${by} · ${at}` : `Sent back by ${by}`
      const resubmitted =
        brand.submittedAt && brand.needsRevisionAt && brand.submittedAt > brand.needsRevisionAt
          ? `Resubmitted ${formatDate(brand.submittedAt)}`
          : null
      const title = resubmitted ? `${full}. ${resubmitted}` : full !== line ? full : null
      return { line, title }
    }
    case BRAND_BRIEF_STATUS.APPROVED: {
      const by = brand.approvedByName ?? 'CEO'
      const at = brand.approvedAt ? formatDate(brand.approvedAt) : null
      const submitted = brand.submittedAt ? formatDate(brand.submittedAt) : null
      const line = at ? `Approved · ${at}` : 'Approved'
      const full = at ? `Approved by ${by} · ${at}` : `Approved by ${by}`
      const timeline =
        submitted && at ? `Submitted ${submitted} → approved ${at}` : null
      const title = timeline ? `${full}. ${timeline}` : full !== line ? full : null
      return { line, title }
    }
    default:
      return { line: brand.status, title: null }
  }
}
