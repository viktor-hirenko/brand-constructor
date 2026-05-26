import { BRAND_BRIEF_STATUS, ROLE_LABELS } from '@brand-constructor/shared'
import type { BrandListItem } from '@brand-constructor/shared'
import {
  BRAND_WAITING_LATE_DAYS,
  BRAND_WAITING_WARN_DAYS,
} from '@/constants/brand-review-sla'

export type WaitingTone = 'normal' | 'warn' | 'late'

export interface BrandReviewDisplay {
  /** Whose turn / workflow queue — no redundant role labels in the cell */
  reviewLine: string
  waitingLine: string
  waitingTone: WaitingTone
  /** Full context: names, dates, resubmit — shown on hover */
  reviewTitle: string | null
  waitingTitle: string | null
  /** ISO timestamp for client-side sort; null for draft */
  waitingSince: string | null
  isApproxDate: boolean
}

export function formatAuthorRole(role: string): string {
  return ROLE_LABELS[role] ?? role
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function daysInStatus(sinceIso: string, now = Date.now()): number {
  const ms = now - new Date(sinceIso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function waitingToneFromDays(days: number): WaitingTone {
  if (days >= BRAND_WAITING_LATE_DAYS) return 'late'
  if (days >= BRAND_WAITING_WARN_DAYS) return 'warn'
  return 'normal'
}

export function formatRelativeUk(sinceIso: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(sinceIso).getTime())
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

interface WaitingSinceResult {
  iso: string | null
  isApprox: boolean
}

export function getWaitingSince(brand: BrandListItem): WaitingSinceResult {
  switch (brand.status) {
    case BRAND_BRIEF_STATUS.DRAFT:
      return { iso: null, isApprox: false }
    case BRAND_BRIEF_STATUS.SUBMITTED:
      if (brand.submittedAt) return { iso: brand.submittedAt, isApprox: false }
      return { iso: brand.updatedAt, isApprox: true }
    case BRAND_BRIEF_STATUS.NEEDS_REVISION:
      if (brand.needsRevisionAt) return { iso: brand.needsRevisionAt, isApprox: false }
      return { iso: brand.updatedAt, isApprox: true }
    case BRAND_BRIEF_STATUS.APPROVED:
      if (brand.approvedAt) return { iso: brand.approvedAt, isApprox: false }
      return { iso: brand.updatedAt, isApprox: true }
    default:
      return { iso: brand.updatedAt, isApprox: true }
  }
}

function formatWaitingLine(
  since: WaitingSinceResult,
  options: { showRelative: boolean }
): string {
  if (!since.iso) return '—'
  const datePart = formatDate(since.iso)
  const prefix = since.isApprox ? '~' : ''
  if (!options.showRelative) {
    return `${prefix}${datePart}`
  }
  return `${prefix}${formatRelativeUk(since.iso)} · ${datePart}`
}

function resubmitSuffix(brand: BrandListItem): string {
  return (brand.submitCount ?? 0) > 1 ? ` · #${brand.submitCount}` : ''
}

const APPROX_DATE_NOTE =
  'Date estimated from last update; open History for full audit trail.'

function approverLabel(name: string | null | undefined): string {
  return name?.trim() || 'CPO/CEO'
}

export function getBrandReviewDisplay(brand: BrandListItem): BrandReviewDisplay {
  const since = getWaitingSince(brand)

  switch (brand.status) {
    case BRAND_BRIEF_STATUS.DRAFT:
      return {
        reviewLine: 'Not submitted',
        waitingLine: '—',
        waitingTone: 'normal',
        reviewTitle: 'Draft — not yet sent for approval.',
        waitingTitle: null,
        waitingSince: null,
        isApproxDate: false,
      }

    case BRAND_BRIEF_STATUS.SUBMITTED: {
      const reviewLine = `Awaiting approval${resubmitSuffix(brand)}`
      const waitingLine = formatWaitingLine(since, { showRelative: true })
      const days = since.iso ? daysInStatus(since.iso) : 0
      const reviewParts = [
        'Awaiting CPO/CEO decision.',
        brand.submittedByName ? `Submitted by ${brand.submittedByName}.` : null,
        (brand.submitCount ?? 0) > 1 ? `Submission #${brand.submitCount}.` : null,
        since.iso && !since.isApprox
          ? `In queue since ${formatDate(since.iso)}.`
          : null,
      ]
      const waitingTitle = since.isApprox
        ? `${waitingLine}. ${APPROX_DATE_NOTE}`
        : since.iso
          ? `Waiting for approval · ${formatRelativeUk(since.iso)} since ${formatDate(since.iso)}`
          : null

      return {
        reviewLine,
        waitingLine,
        waitingTone: since.iso ? waitingToneFromDays(days) : 'normal',
        reviewTitle: reviewParts.filter(Boolean).join(' ') || null,
        waitingTitle,
        waitingSince: since.iso,
        isApproxDate: since.isApprox,
      }
    }

    case BRAND_BRIEF_STATUS.NEEDS_REVISION: {
      const reviewLine = 'Awaiting PO'
      const waitingLine = formatWaitingLine(since, { showRelative: true })
      const days = since.iso ? daysInStatus(since.iso) : 0
      const returnedBy = approverLabel(brand.needsRevisionByName)
      const reviewParts = [
        `Waiting for ${brand.authorName} (Product Owner) to revise.`,
        since.iso
          ? `Returned by ${returnedBy} · ${formatDate(since.iso)}.`
          : `Returned by ${returnedBy}.`,
      ]
      const waitingTitle = since.isApprox
        ? `${waitingLine}. ${APPROX_DATE_NOTE}`
        : `PO revision pending · ${waitingLine}`

      return {
        reviewLine,
        waitingLine,
        waitingTone: since.iso ? waitingToneFromDays(days) : 'normal',
        reviewTitle: reviewParts.join(' '),
        waitingTitle,
        waitingSince: since.iso,
        isApproxDate: since.isApprox,
      }
    }

    case BRAND_BRIEF_STATUS.APPROVED: {
      const waitingLine = formatWaitingLine(since, { showRelative: false })
      const approver = approverLabel(brand.approvedByName)
      const approvedOn = since.iso ? formatDate(since.iso) : null
      const submitted = brand.submittedAt ? formatDate(brand.submittedAt) : null
      const reviewParts = [
        approvedOn ? `Approved by ${approver} · ${approvedOn}.` : `Approved by ${approver}.`,
        submitted ? `Originally submitted ${submitted}.` : null,
      ]

      return {
        reviewLine: '—',
        waitingLine,
        waitingTone: 'normal',
        reviewTitle: reviewParts.filter(Boolean).join(' '),
        waitingTitle: since.isApprox
          ? `${waitingLine}. ${APPROX_DATE_NOTE}`
          : approvedOn
            ? `Approved ${approvedOn}`
            : null,
        waitingSince: since.iso,
        isApproxDate: since.isApprox,
      }
    }

    default:
      return {
        reviewLine: brand.status,
        waitingLine: '—',
        waitingTone: 'normal',
        reviewTitle: null,
        waitingTitle: null,
        waitingSince: since.iso,
        isApproxDate: since.isApprox,
      }
  }
}

/** @deprecated Use getBrandReviewDisplay */
export function getBrandReviewLabel(brand: BrandListItem): {
  line: string
  title: string | null
} {
  const d = getBrandReviewDisplay(brand)
  return {
    line: d.reviewLine,
    title: d.reviewTitle,
  }
}
