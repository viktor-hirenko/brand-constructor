import type { ExternalNaming } from '@brand-constructor/shared/types'

type NamingAvailability = Pick<ExternalNaming, 'id' | 'availability_status'>

/** PO/CEO rule: comment required when multiple names or any sold name is selected. */
export function isExternalNamingCommentRequired(
  selectedIds: string[],
  namings: NamingAvailability[]
): boolean {
  if (selectedIds.length > 1) return true
  if (selectedIds.length === 0) return false
  const byId = new Map(namings.map(n => [n.id, n]))
  return selectedIds.some(id => byId.get(id)?.availability_status === 'sold')
}

export function getExternalNamingCommentHint(
  selectedIds: string[],
  namings: NamingAvailability[]
): string {
  const many = selectedIds.length > 1
  const sold = selectedIds.some(id => {
    const status = namings.find(n => n.id === id)?.availability_status
    return status === 'sold'
  })
  if (many && sold) return "Коментар обов'язковий при виборі кількох назв або викупленої назви"
  if (many) return "Коментар обов'язковий при виборі кількох назв"
  if (sold) return "Коментар обов'язковий при виборі викупленої назви"
  return ''
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
