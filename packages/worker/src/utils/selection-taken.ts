import type { D1Database } from '@cloudflare/workers-types'

/**
 * H-09 without the orders feature: an approved brand owns its concept and
 * names (`used_in_brand_id`). The library hides them from new picks, but two
 * briefs may have picked the same item before either was approved — approving
 * the second must not take it from the first (full run 06.10, bug 4).
 *
 * The orders feature has the same rule plus «made for another brief»
 * (`utils/orders.ts`, `checkSelectable`); this is its part without orders.
 */
export interface PickedIds {
  conceptIds: string[]
  externalIds: string[]
  internalIds: string[]
}

const TABLES: Array<{ key: keyof PickedIds; table: string }> = [
  { key: 'conceptIds', table: 'concepts' },
  { key: 'externalIds', table: 'external_namings' },
  { key: 'internalIds', table: 'internal_namings' },
]

export function pickedIds(sel: {
  conceptId: string | null
  externalIds: string[]
  internalId: string | null
}): PickedIds {
  return {
    conceptIds: sel.conceptId ? [sel.conceptId] : [],
    externalIds: sel.externalIds.filter(Boolean),
    internalIds: sel.internalId ? [sel.internalId] : [],
  }
}

/** `null` when brand `brandId` may take all of `ids`; else the message naming the first taken item. */
export async function takenByAnotherBrand(
  db: D1Database,
  brandId: string,
  ids: PickedIds
): Promise<string | null> {
  for (const { key, table } of TABLES) {
    const list = [...new Set(ids[key])]
    if (list.length === 0) continue
    const rows = await db
      .prepare(
        `SELECT t.name, t.used_in_brand_id, b.internal_name AS used_in_name
         FROM ${table} t LEFT JOIN brands b ON b.id = t.used_in_brand_id
         WHERE t.id IN (${list.map(() => '?').join(',')})`
      )
      .bind(...list)
      .all<{ name: string; used_in_brand_id: string | null; used_in_name: string | null }>()
    for (const row of rows.results) {
      if (row.used_in_brand_id && row.used_in_brand_id !== brandId) {
        return `«${row.name}» уже використано в ${row.used_in_name ?? 'іншому бренді'}. Оберіть інше.`
      }
    }
  }
  return null
}

/**
 * The same rule as an SQL condition for the approving UPDATE, so two approvals
 * in the same second cannot both pass the check above and both take the item.
 */
export function freeOfOtherBrands(brandId: string, ids: PickedIds): { sql: string; binds: string[] } {
  const parts: string[] = []
  const binds: string[] = []
  for (const { key, table } of TABLES) {
    const list = [...new Set(ids[key])]
    if (list.length === 0) continue
    parts.push(
      `NOT EXISTS (SELECT 1 FROM ${table} WHERE id IN (${list.map(() => '?').join(',')}) AND used_in_brand_id IS NOT NULL AND used_in_brand_id != ?)`
    )
    binds.push(...list, brandId)
  }
  return { sql: parts.length > 0 ? ` AND ${parts.join(' AND ')}` : '', binds }
}
