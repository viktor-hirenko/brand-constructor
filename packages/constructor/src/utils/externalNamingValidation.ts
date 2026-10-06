import type { ExternalNaming } from '@brand-constructor/shared/types'

type NamingAvailability = Pick<ExternalNaming, 'id' | 'availability_status'>

/**
 * Statuses that need the customer to explain the pick: Sold (taken), and For
 * sale — taken too, and it costs thousands to buy (owner's decision Р3,
 * domain-status-plan.md).
 */
const NEEDS_COMMENT = new Set(['sold', 'for_sale'])

/** PO/CEO rule: comment required when multiple names or any taken name is selected. */
export function isExternalNamingCommentRequired(
  selectedIds: string[],
  namings: NamingAvailability[]
): boolean {
  if (selectedIds.length > 1) return true
  if (selectedIds.length === 0) return false
  const byId = new Map(namings.map(n => [n.id, n]))
  return selectedIds.some(id => NEEDS_COMMENT.has(byId.get(id)?.availability_status ?? ''))
}

export function getExternalNamingCommentHint(
  selectedIds: string[],
  namings: NamingAvailability[]
): string {
  const statuses = selectedIds.map(id => namings.find(n => n.id === id)?.availability_status)
  const reasons: string[] = []
  if (selectedIds.length > 1) reasons.push('кількох назв')
  if (statuses.includes('sold')) reasons.push('викупленої назви')
  if (statuses.includes('for_sale')) reasons.push('назви, яку треба викупити')
  if (reasons.length === 0) return ''
  return `Коментар обов'язковий при виборі ${reasons.join(' або ')}`
}

export function isExternalNamingStepValid(
  selectedIds: string[],
  comment: string,
  hasNewBrief: boolean,
  namings: NamingAvailability[]
): boolean {
  if (hasNewBrief) return true
  if (selectedIds.length === 0) return false
  if (isExternalNamingCommentRequired(selectedIds, namings) && comment.trim() === '') {
    return false
  }
  return true
}
