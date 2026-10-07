import { ORDER_KINDS } from '@brand-constructor/shared'
import type { OrderListItem } from '@brand-constructor/shared'

/**
 * «For brief» on the library pages (brief-orders plan, phase 2a): which briefs
 * an item of this kind can be made for. The worker decides (`checkOrderTarget`);
 * this only keeps the list honest — briefs still `in_work` whose matching order
 * stands. Pure, so the Admin's node tests can pin it.
 */

export type LibraryItemKind = 'concept' | 'external' | 'internal'

export function briefsForKind(items: OrderListItem[], kind: LibraryItemKind): OrderListItem[] {
  return items.filter(item => {
    if (item.state !== 'open' && item.state !== 'ready') return false
    const open = item.openKinds
    if (kind === 'concept') return open.includes(ORDER_KINDS.CONCEPT)
    if (kind === 'internal') return open.includes(ORDER_KINDS.INTERNAL_NAMING)
    return open.includes(ORDER_KINDS.EXTERNAL_NAMING) || open.includes(ORDER_KINDS.CONCEPT)
  })
}

/** «For New Brand #N» — the plate on a library item made for a brief. */
export function forBriefLabel(item: { for_brand_id?: string | null; for_brand_name?: string | null }): string | null {
  if (!item.for_brand_id) return null
  return `Для ${item.for_brand_name || 'брифу'}`
}
