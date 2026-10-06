import { BRAND_BRIEF_STATUS, ROLE_LABELS, brandHasNewBriefsFromBrand } from '@brand-constructor/shared'
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
  if (hours < 1) return '<1 год'
  if (hours < 24) return `${hours} год`
  const days = Math.floor(hours / 24)
  return `${days} дн.`
}

interface WaitingSinceResult {
  iso: string | null
  isApprox: boolean
}

/**
 * Status tabs of the Brands list. The CEO never gets «Drafts» — those briefs
 * are not hers yet (the server does not list drafts to her, H-37).
 */
export function brandStatusTabs(opts: { isCeo: boolean }): { key: string; label: string }[] {
  return [
    { key: 'all', label: 'Усі' },
    ...(opts.isCeo ? [] : [{ key: BRAND_BRIEF_STATUS.DRAFT, label: 'Drafts' }]),
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'needs_revision', label: 'Needs Revision' },
  ]
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
  'Дата приблизна — за останнім оновленням; усі події — в «Історії».'

function approverLabel(name: string | null | undefined): string {
  return name?.trim() || 'CPO/CEO'
}

export function getBrandReviewDisplay(brand: BrandListItem): BrandReviewDisplay {
  const since = getWaitingSince(brand)

  switch (brand.status) {
    case BRAND_BRIEF_STATUS.DRAFT:
      return {
        reviewLine: 'Не надіслано',
        waitingLine: '—',
        waitingTone: 'normal',
        reviewTitle: 'Draft — ще не надіслано на погодження.',
        waitingTitle: null,
        waitingSince: null,
        isApproxDate: false,
      }

    case BRAND_BRIEF_STATUS.SUBMITTED: {
      if (brandHasNewBriefsFromBrand(brand)) {
        const waitingLine = formatWaitingLine(since, { showRelative: true })
        const days = since.iso ? daysInStatus(since.iso) : 0
        return {
          reviewLine: 'In work with team',
          waitingLine,
          waitingTone: since.iso ? waitingToneFromDays(days) : 'normal',
          reviewTitle:
            'Команди отримали в Slack замовлення на новий концепт або неймінг. Далі Product Owner обирає з бібліотеки й надсилає CEO.',
          waitingTitle: since.iso
            ? `У роботі з ${formatDate(since.iso)}`
            : null,
          waitingSince: since.iso,
          isApproxDate: since.isApprox,
        }
      }

      const reviewLine = `Очікує погодження${resubmitSuffix(brand)}`
      const waitingLine = formatWaitingLine(since, { showRelative: true })
      const days = since.iso ? daysInStatus(since.iso) : 0
      const reviewParts = [
        'Очікує рішення CPO/CEO.',
        brand.submittedByName ? `Надіслано: ${brand.submittedByName}.` : null,
        (brand.submitCount ?? 0) > 1 ? `Надсилання #${brand.submitCount}.` : null,
        since.iso && !since.isApprox
          ? `У черзі з ${formatDate(since.iso)}.`
          : null,
      ]
      const waitingTitle = since.isApprox
        ? `${waitingLine}. ${APPROX_DATE_NOTE}`
        : since.iso
          ? `Очікує погодження · ${formatRelativeUk(since.iso)}, з ${formatDate(since.iso)}`
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
      const reviewLine = 'Очікує PO'
      const waitingLine = formatWaitingLine(since, { showRelative: true })
      const days = since.iso ? daysInStatus(since.iso) : 0
      const returnedBy = approverLabel(brand.needsRevisionByName)
      const reviewParts = [
        `Доопрацьовує: ${brand.authorName} (Product Owner).`,
        since.iso
          ? `Повернуто: ${returnedBy} · ${formatDate(since.iso)}.`
          : `Повернуто: ${returnedBy}.`,
      ]
      const waitingTitle = since.isApprox
        ? `${waitingLine}. ${APPROX_DATE_NOTE}`
        : `Доопрацювання в PO · ${waitingLine}`

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
        approvedOn ? `Погоджено: ${approver} · ${approvedOn}.` : `Погоджено: ${approver}.`,
        submitted ? `Уперше надіслано ${submitted}.` : null,
      ]

      return {
        reviewLine: '—',
        waitingLine,
        waitingTone: 'normal',
        reviewTitle: reviewParts.filter(Boolean).join(' '),
        waitingTitle: since.isApprox
          ? `${waitingLine}. ${APPROX_DATE_NOTE}`
          : approvedOn
            ? `Погоджено ${approvedOn}`
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
