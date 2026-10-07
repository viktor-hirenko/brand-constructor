import { ORDER_KINDS, type OrderKind } from '@brand-constructor/shared'
import type { OrderCreatedConcept, OrderCreatedNaming } from '@brand-constructor/shared/types'
import { orderedSections } from './brand-workflow'
import { asIdArray, firstId, type BrandRow } from './brands'
import type { BriefSelection } from './brief-checks'

/**
 * Orders of a brief and what the teams made for them (brief-orders plan,
 * phase 2a). An order is not a row of its own: it is the brief's
 * `new_concept_brief` / `new_naming_brief` / Internal Naming feedback, and a
 * library item made for it carries `for_brand_id`. While that is set the item
 * is reserved: no other brief sees it in the wizard or may pick it, here on the
 * server. The reserve is released when the order is cancelled, the brief is
 * deleted, or — for what the author did not pick — on approval.
 */

const KIND_ORDER: OrderKind[] = [
  ORDER_KINDS.CONCEPT,
  ORDER_KINDS.EXTERNAL_NAMING,
  ORDER_KINDS.INTERNAL_NAMING,
]

function asKinds(values: unknown): OrderKind[] {
  const list = Array.isArray(values) ? values : []
  return KIND_ORDER.filter(k => list.includes(k))
}

/** The orders still standing on the brief (none replaced by a library pick yet). */
export function openOrderKinds(row: BrandRow): OrderKind[] {
  return asKinds(orderedSections(row))
}

export interface MadeCounts {
  concepts: number
  externalNamings: number
  internalNamings: number
}

/**
 * Everything ordered when the brief went to the teams — kept on the
 * `sent_to_work` event, because a cancelled order leaves nothing on the brief.
 * Briefs moved to `in_work` by migration 013 have no such list; for them the
 * standing orders and what the team made for the brief are the best answer.
 * With the list at hand what was made does not add kinds: after the CEO returned
 * a brief and it was ordered again (phase 4), the previous round's picks are
 * still made for the brief but are not ordered this time.
 */
export function orderedKinds(meta: string | null | undefined, row: BrandRow, made: MadeCounts): OrderKind[] {
  let fromEvent: OrderKind[] = []
  let listed = false
  if (meta) {
    try {
      const orders = (JSON.parse(meta) as { orders?: unknown }).orders
      listed = Array.isArray(orders)
      fromEvent = asKinds(orders)
    } catch {
      /* unreadable meta: the other sources still answer */
    }
  }
  const open = openOrderKinds(row)
  if (listed) return KIND_ORDER.filter(k => fromEvent.includes(k) || open.includes(k))
  const fromMade: OrderKind[] = []
  if (made.concepts > 0) fromMade.push(ORDER_KINDS.CONCEPT)
  if (made.internalNamings > 0) fromMade.push(ORDER_KINDS.INTERNAL_NAMING)
  const conceptKnown = [...fromEvent, ...open, ...fromMade].includes(ORDER_KINDS.CONCEPT)
  if (made.externalNamings > 0 && !conceptKnown) fromMade.push(ORDER_KINDS.EXTERNAL_NAMING)
  return KIND_ORDER.filter(k => fromEvent.includes(k) || open.includes(k) || fromMade.includes(k))
}

/** Kinds the author cancelled, from `order_cancelled` events (`meta.kind`). */
export function cancelledKindsFromEvents(metas: string[]): OrderKind[] {
  const kinds: unknown[] = []
  for (const meta of metas) {
    try {
      kinds.push((JSON.parse(meta) as { kind?: unknown }).kind)
    } catch {
      /* unreadable meta names no kind */
    }
  }
  return asKinds(kinds)
}

/**
 * Cancellations of the current round of orders — since the brief was last sent
 * to the teams (`sent_to_work_at`); a round before the CEO's return is history.
 */
export async function loadCancelledKinds(
  db: D1Database,
  brandId: string,
  since: string | null | undefined
): Promise<OrderKind[]> {
  const rows = await db
    .prepare(
      `SELECT meta FROM brand_workflow_events
       WHERE brand_id = ? AND event_type = 'order_cancelled' AND (? IS NULL OR created_at >= ?)`
    )
    .bind(brandId, since ?? null, since ?? null)
    .all<{ meta: string }>()
  return cancelledKindsFromEvents(rows.results.map(r => r.meta))
}

export async function loadOrderedKinds(
  db: D1Database,
  row: BrandRow,
  created: CreatedForBrief
): Promise<{ kinds: OrderKind[]; snapshot: Record<string, unknown> }> {
  const event = await db
    .prepare(
      `SELECT meta FROM brand_workflow_events
       WHERE brand_id = ? AND event_type = 'sent_to_work'
       ORDER BY created_at DESC, rowid DESC LIMIT 1`
    )
    .bind(row.id)
    .first<{ meta: string }>()
  const snapshot = orderAnswersKept(event?.meta)
  const kinds = orderedKinds(event?.meta, row, {
    concepts: created.concepts.length,
    externalNamings: created.externalNamings.length,
    internalNamings: created.internalNamings.length,
  })
  return { kinds, snapshot }
}

function parseJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function internalOrderFeedback(row: Pick<BrandRow, 'step_data'>): string | null {
  const stepData = parseJson(row.step_data) as { internalNaming?: { newNamingFeedback?: unknown } } | null
  const feedback = stepData?.internalNaming?.newNamingFeedback
  return typeof feedback === 'string' && feedback.trim() ? feedback : null
}

export function conceptOrder(row: BrandRow): Record<string, unknown> | null {
  return parseJson(row.new_concept_brief)
}

export function namingOrder(row: BrandRow): Record<string, unknown> | null {
  return parseJson(row.new_naming_brief)
}

/** The copy of the order's answers kept on the `sent_to_work` event, by kind. */
export function orderAnswersKept(sentMeta: string | null | undefined): Record<string, unknown> {
  try {
    const answers = sentMeta ? (JSON.parse(sentMeta) as { answers?: unknown }).answers : null
    return answers && typeof answers === 'object' ? (answers as Record<string, unknown>) : {}
  } catch {
    /* no copy kept (sent before it existed) */
    return {}
  }
}

/**
 * The earliest deadline among the orders, as the author typed it. A closed
 * order's answers left the brief with it, so the date is then read from the
 * copy on the `sent_to_work` event — or every order in the Archive would have
 * no deadline (owner, 07.10: «почему дедлайн пустой»).
 */
export function orderDeadline(row: BrandRow, sentMeta?: string | null): string | null {
  const kept = orderAnswersKept(sentMeta)
  const deadlineOf = (order: unknown) => (order as { namingDeadline?: unknown } | null | undefined)?.namingDeadline
  const dates = [
    deadlineOf(conceptOrder(row) ?? kept[ORDER_KINDS.CONCEPT]),
    deadlineOf(namingOrder(row) ?? kept[ORDER_KINDS.EXTERNAL_NAMING]),
  ].filter((d): d is string => typeof d === 'string' && d !== '')
  return dates.sort()[0] ?? null
}

// ---------------------------------------------------------------------------
// What the teams made
// ---------------------------------------------------------------------------

export interface CreatedForBrief {
  concepts: OrderCreatedConcept[]
  externalNamings: OrderCreatedNaming[]
  internalNamings: OrderCreatedNaming[]
}

export async function loadCreatedForBrief(db: D1Database, brandId: string): Promise<CreatedForBrief> {
  const [concepts, externals, internals] = await Promise.all([
    db
      .prepare(
        `SELECT c.id, c.name, c.description, c.visual_url, c.status, c.used_in_brand_id, c.created_at,
                u.name AS author_name
         FROM concepts c LEFT JOIN users u ON u.id = c.created_by
         WHERE c.for_brand_id = ? ORDER BY c.created_at, c.rowid`
      )
      .bind(brandId)
      .all<{ id: string; name: string; description: string; visual_url: string | null; status: string; used_in_brand_id: string | null; created_at: string; author_name: string | null }>(),
    db
      .prepare(
        `SELECT en.id, en.name, en.tagline, en.domain, en.availability_status, en.concept_id, c.name AS concept_name, en.status,
                en.used_in_brand_id, en.created_at, u.name AS author_name
         FROM external_namings en LEFT JOIN concepts c ON c.id = en.concept_id
         LEFT JOIN users u ON u.id = en.created_by
         WHERE en.for_brand_id = ? ORDER BY en.created_at, en.rowid`
      )
      .bind(brandId)
      .all<NamingRow & { domain: string | null; availability_status: string | null; concept_id: string | null; concept_name: string | null }>(),
    db
      .prepare(
        `SELECT n.id, n.name, n.tagline, n.status, n.used_in_brand_id, n.created_at, u.name AS author_name
         FROM internal_namings n LEFT JOIN users u ON u.id = n.created_by
         WHERE n.for_brand_id = ? ORDER BY n.created_at, n.rowid`
      )
      .bind(brandId)
      .all<NamingRow>(),
  ])
  return {
    concepts: concepts.results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      authorName: r.author_name,
      visualUrl: r.visual_url,
      status: r.status,
      usedInBrand: r.used_in_brand_id === brandId,
      createdAt: r.created_at,
    })),
    externalNamings: externals.results.map(r => ({
      ...namingOut(r, brandId, r.concept_id, r.concept_name),
      domain: r.domain,
      availability: r.availability_status,
    })),
    internalNamings: internals.results.map(r => namingOut(r, brandId, null, null)),
  }
}

interface NamingRow {
  id: string
  name: string
  author_name: string | null
  tagline: string
  status: string
  used_in_brand_id: string | null
  created_at: string
}

function namingOut(
  r: NamingRow,
  brandId: string,
  conceptId: string | null,
  conceptName: string | null
): OrderCreatedNaming {
  return {
    id: r.id,
    name: r.name,
    authorName: r.author_name,
    tagline: r.tagline,
    domain: null,
    availability: null,
    conceptId,
    conceptName,
    status: r.status,
    usedInBrand: r.used_in_brand_id === brandId,
    createdAt: r.created_at,
  }
}

/**
 * What was made for the given kinds of order. A brief ordered again after the
 * CEO's return keeps its earlier picks reserved (`for_brand_id`); they belong
 * to the earlier round, not to this one (phase 4). Names go with a concept order.
 */
export function createdForKinds(created: CreatedForBrief, kinds: OrderKind[]): CreatedForBrief {
  return {
    concepts: kinds.includes(ORDER_KINDS.CONCEPT) ? created.concepts : [],
    externalNamings:
      kinds.includes(ORDER_KINDS.EXTERNAL_NAMING) || kinds.includes(ORDER_KINDS.CONCEPT)
        ? created.externalNamings
        : [],
    internalNamings: kinds.includes(ORDER_KINDS.INTERNAL_NAMING) ? created.internalNamings : [],
  }
}

/**
 * What is still missing before «Відправити замовнику», per standing order: a new concept
 * needs the concept and at least one name of it; a naming order — at least one
 * name; an Internal Naming order — at least one Internal Naming.
 */
export function readyBlockers(openKinds: OrderKind[], created: CreatedForBrief): string[] {
  const out: string[] = []
  if (openKinds.includes(ORDER_KINDS.CONCEPT)) {
    if (created.concepts.length === 0) {
      out.push('Створіть концепт.')
    } else {
      const conceptIds = new Set(created.concepts.map(c => c.id))
      if (!created.externalNamings.some(n => n.conceptId && conceptIds.has(n.conceptId))) {
        out.push('Створіть назву для концепту.')
      }
    }
  }
  if (openKinds.includes(ORDER_KINDS.EXTERNAL_NAMING) && created.externalNamings.length === 0) {
    out.push('Створіть назву.')
  }
  if (openKinds.includes(ORDER_KINDS.INTERNAL_NAMING) && created.internalNamings.length === 0) {
    out.push('Створіть внутрішню назву.')
  }
  return out
}

// ---------------------------------------------------------------------------
// Making an item for a brief (concepts / namings POST and PUT)
// ---------------------------------------------------------------------------

export type LibraryKind = 'concept' | 'external' | 'internal'

/**
 * External Namings an order may get: the author picks up to three on the
 * External Naming step (`ExternalNamingGrid` `maxSelectable`), so offering more
 * gives nothing to pick from. A concept and an Internal Naming are one each.
 */
export const MAX_ORDER_NAMES = 3

/**
 * May an item of `kind` be made for (or attached to) brief `brandId`? Only
 * while the brief is `in_work` and the matching order still stands. A name for
 * a new concept goes to a concept made for the same brief; a name for a naming
 * order goes to the brief's own concept. Returns the message, or `null`.
 */
export async function checkOrderTarget(
  db: D1Database,
  brandId: string,
  kind: LibraryKind,
  conceptId: string | null | undefined
): Promise<string | null> {
  const brief = await db.prepare('SELECT * FROM brands WHERE id = ?').bind(brandId).first<BrandRow>()
  if (!brief) return 'Бриф не знайдено.'
  if (brief.status !== 'in_work') return 'Бриф уже не в роботі — створювати для нього не можна.'
  // The author was sent exactly exactly what is there (owner, 01.10).
  if (brief.orders_ready_at) return 'Замовлення вже відправлено замовнику — додати до нього не можна.'

  const open = openOrderKinds(brief)
  if (kind === 'concept') {
    return open.includes(ORDER_KINDS.CONCEPT) ? null : 'У брифі немає замовлення нового концепту.'
  }
  if (kind === 'internal') {
    return open.includes(ORDER_KINDS.INTERNAL_NAMING)
      ? null
      : 'У брифі немає замовлення Internal Naming.'
  }

  const made = await db
    .prepare('SELECT COUNT(*) AS n FROM external_namings WHERE for_brand_id = ?')
    .bind(brandId)
    .first<{ n: number }>()
  if (Number(made?.n ?? 0) >= MAX_ORDER_NAMES) {
    return `Замовник може обрати не більше ${MAX_ORDER_NAMES} назв — для цього замовлення їх уже достатньо.`
  }

  if (open.includes(ORDER_KINDS.CONCEPT)) {
    if (!conceptId) return 'Назва до нового концепту: оберіть концепт, створений для цього брифу.'
    const concept = await db
      .prepare('SELECT for_brand_id FROM concepts WHERE id = ?')
      .bind(conceptId)
      .first<{ for_brand_id: string | null }>()
    if (concept?.for_brand_id !== brandId) {
      return 'Назва до нового концепту: оберіть концепт, створений для цього брифу.'
    }
    return null
  }
  if (open.includes(ORDER_KINDS.EXTERNAL_NAMING)) {
    if (conceptId && brief.concept_id && conceptId !== brief.concept_id) {
      return 'Назва для цього замовлення має належати концепту брифу.'
    }
    return null
  }
  return 'У брифі немає замовлення назви.'
}

/** Another brief that is not finished yet has already picked this item. */
export async function pickedByAnotherBrief(
  db: D1Database,
  kind: LibraryKind,
  itemId: string,
  brandId: string
): Promise<boolean> {
  const where =
    kind === 'concept'
      ? 'concept_id = ?'
      : kind === 'internal'
        ? 'internal_naming_id = ?'
        : "EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(external_naming_ids) THEN external_naming_ids ELSE '[]' END) WHERE value = ?)"
  const row = await db
    .prepare(`SELECT id FROM brands WHERE status != 'approved' AND id != ? AND ${where} LIMIT 1`)
    .bind(brandId, itemId)
    .first<{ id: string }>()
  return row !== null
}

/** Once sent to the author, the made items stay as they are: the author was told about them. */
export async function reserveIsFrozen(db: D1Database, forBrandId: string | null | undefined): Promise<boolean> {
  if (!forBrandId) return false
  const brief = await db
    .prepare('SELECT orders_ready_at FROM brands WHERE id = ?')
    .bind(forBrandId)
    .first<{ orders_ready_at: string | null }>()
  return Boolean(brief?.orders_ready_at)
}

export const RESERVE_FROZEN_MESSAGE =
  'Замовлення вже відправлено замовнику — створене для нього не можна видалити чи перепривʼязати.'

// ---------------------------------------------------------------------------
// The reserve when a brief picks (PUT brief, CEO selections, approval)
// ---------------------------------------------------------------------------

export interface PickedIds {
  conceptIds: string[]
  externalIds: string[]
  internalIds: string[]
}

export function pickedFromSelection(sel: BriefSelection): PickedIds {
  return {
    conceptIds: sel.conceptId ? [sel.conceptId] : [],
    externalIds: sel.externalIds,
    internalIds: sel.internalId ? [sel.internalId] : [],
  }
}

export function pickedFromCeoSelections(ceo: Record<string, string | string[]>): PickedIds {
  const concept = firstId(ceo.concept)
  const internal = firstId(ceo.internalNaming)
  return {
    conceptIds: concept ? [concept] : [],
    externalIds: asIdArray(ceo.externalNaming),
    internalIds: internal ? [internal] : [],
  }
}

const TABLES: Array<{ key: keyof PickedIds; table: string }> = [
  { key: 'conceptIds', table: 'concepts' },
  { key: 'externalIds', table: 'external_namings' },
  { key: 'internalIds', table: 'internal_namings' },
]

/**
 * `null` when brief `brandId` may pick every one of `ids`; otherwise the
 * message naming the first item that is made for another brief or already
 * used in another brand.
 */
export async function checkSelectable(
  db: D1Database,
  brandId: string,
  ids: PickedIds
): Promise<string | null> {
  for (const { key, table } of TABLES) {
    const list = [...new Set(ids[key].filter(Boolean))]
    if (list.length === 0) continue
    const rows = await db
      .prepare(
        `SELECT t.name, t.for_brand_id, t.used_in_brand_id, b.internal_name AS used_in_name
         FROM ${table} t LEFT JOIN brands b ON b.id = t.used_in_brand_id
         WHERE t.id IN (${list.map(() => '?').join(',')})`
      )
      .bind(...list)
      .all<{ name: string; for_brand_id: string | null; used_in_brand_id: string | null; used_in_name: string | null }>()
    for (const row of rows.results) {
      if (row.used_in_brand_id && row.used_in_brand_id !== brandId) {
        return `«${row.name}» уже використано в ${row.used_in_name ?? 'іншому бренді'}. Оберіть інше.`
      }
      if (row.for_brand_id && row.for_brand_id !== brandId) {
        return `«${row.name}» створено на замовлення іншого брифу. Оберіть інше.`
      }
    }
  }
  return null
}

/**
 * The same rule as `checkSelectable`, as an SQL condition for the approving
 * UPDATE: the brief flips to `approved` only if none of its final picks was
 * taken in between (H-09) — and the library marks run only if it flipped.
 */
export function selectionFreeCondition(
  brandId: string,
  ids: PickedIds
): { sql: string; binds: string[] } {
  const parts: string[] = []
  const binds: string[] = []
  for (const { key, table } of TABLES) {
    const list = [...new Set(ids[key].filter(Boolean))]
    if (list.length === 0) continue
    parts.push(
      `NOT EXISTS (SELECT 1 FROM ${table} WHERE id IN (${list.map(() => '?').join(',')}) AND ((used_in_brand_id IS NOT NULL AND used_in_brand_id != ?) OR (for_brand_id IS NOT NULL AND for_brand_id != ?)))`
    )
    binds.push(...list, brandId, brandId)
  }
  return { sql: parts.length > 0 ? ` AND ${parts.join(' AND ')}` : '', binds }
}

/** Ids of `next` that `previous` did not have — what the author picked just now. */
export function newlyPicked(previous: PickedIds, next: PickedIds): PickedIds {
  const diff = (a: string[], b: string[]) => b.filter(id => !a.includes(id))
  return {
    conceptIds: diff(previous.conceptIds, next.conceptIds),
    externalIds: diff(previous.externalIds, next.externalIds),
    internalIds: diff(previous.internalIds, next.internalIds),
  }
}

// ---------------------------------------------------------------------------
// Releasing the reserve
// ---------------------------------------------------------------------------

/** Every item made for the brief goes back to the library (brief deleted). */
export function releaseAllStatements(db: D1Database, brandId: string): D1PreparedStatement[] {
  return TABLES.map(({ table }) =>
    db.prepare(`UPDATE ${table} SET for_brand_id = NULL WHERE for_brand_id = ?`).bind(brandId)
  )
}

/**
 * On approval: what the brief did not pick goes back to the library; what it
 * picked is `used` by now and keeps the mark as history. `guard` is the
 * "this request approved it" condition of the approve batch.
 */
export function releaseUnpickedOnApprovalStatements(
  db: D1Database,
  brandId: string,
  guard: { sql: string; binds: string[] }
): D1PreparedStatement[] {
  return TABLES.map(({ table }) =>
    db
      .prepare(
        `UPDATE ${table} SET for_brand_id = NULL
         WHERE for_brand_id = ? AND (used_in_brand_id IS NULL OR used_in_brand_id != ?) AND ${guard.sql}`
      )
      .bind(brandId, brandId, ...guard.binds)
  )
}

/**
 * A new round of orders after the CEO's return (`needs_revision → in_work`,
 * phase 4): what the teams made for the brief and it does not hold now goes
 * back to the library; what it holds stays reserved for it.
 */
export function releaseUnpickedStatements(
  db: D1Database,
  brandId: string,
  keep: BriefSelection
): D1PreparedStatement[] {
  const notIn = (ids: string[]) => (ids.length > 0 ? ` AND id NOT IN (${ids.map(() => '?').join(',')})` : '')
  const keepConcepts = keep.conceptId ? [keep.conceptId] : []
  const keepInternals = keep.internalId ? [keep.internalId] : []
  return [
    db
      .prepare(`UPDATE concepts SET for_brand_id = NULL WHERE for_brand_id = ?${notIn(keepConcepts)}`)
      .bind(brandId, ...keepConcepts),
    db
      .prepare(`UPDATE external_namings SET for_brand_id = NULL WHERE for_brand_id = ?${notIn(keep.externalIds)}`)
      .bind(brandId, ...keep.externalIds),
    db
      .prepare(`UPDATE internal_namings SET for_brand_id = NULL WHERE for_brand_id = ?${notIn(keepInternals)}`)
      .bind(brandId, ...keepInternals),
  ]
}

/**
 * An order the author replaced with a library pick: its made items go back to
 * the library, except what the author picked. For a new concept that includes
 * the names made for the released concepts.
 */
export function releaseCancelledStatements(
  db: D1Database,
  brandId: string,
  kind: OrderKind,
  keep: BriefSelection
): D1PreparedStatement[] {
  const keepConcept = keep.conceptId ?? ''
  const keepExt = keep.externalIds
  const notIn = (ids: string[]) => (ids.length > 0 ? ` AND id NOT IN (${ids.map(() => '?').join(',')})` : '')

  if (kind === ORDER_KINDS.CONCEPT) {
    return [
      db
        .prepare(
          `UPDATE external_namings SET for_brand_id = NULL
           WHERE for_brand_id = ? AND concept_id IN (SELECT id FROM concepts WHERE for_brand_id = ? AND id != ?)${notIn(keepExt)}`
        )
        .bind(brandId, brandId, keepConcept, ...keepExt),
      db
        .prepare('UPDATE concepts SET for_brand_id = NULL WHERE for_brand_id = ? AND id != ?')
        .bind(brandId, keepConcept),
    ]
  }
  if (kind === ORDER_KINDS.EXTERNAL_NAMING) {
    return [
      db
        .prepare(`UPDATE external_namings SET for_brand_id = NULL WHERE for_brand_id = ?${notIn(keepExt)}`)
        .bind(brandId, ...keepExt),
    ]
  }
  return [
    db
      .prepare('UPDATE internal_namings SET for_brand_id = NULL WHERE for_brand_id = ? AND id != ?')
      .bind(brandId, keep.internalId ?? ''),
  ]
}

// ---------------------------------------------------------------------------
// The author drops an order while the brief is `in_work`
// ---------------------------------------------------------------------------

interface OrderFieldsBody {
  newConceptBrief?: unknown
  newNamingBrief?: unknown
  stepData?: unknown
}

/**
 * Orders this save takes off the brief. The wizard sends the whole brief on
 * every save, so an order is dropped only when the stored one exists and the
 * incoming value is explicitly empty (`checkInWorkEdit` already refused adding
 * or changing one).
 */
export function droppedOrderKinds(existing: BrandRow, body: OrderFieldsBody): OrderKind[] {
  const out: OrderKind[] = []
  if (existing.new_concept_brief != null && body.newConceptBrief === null) out.push(ORDER_KINDS.CONCEPT)
  if (existing.new_naming_brief != null && body.newNamingBrief === null) {
    out.push(ORDER_KINDS.EXTERNAL_NAMING)
  }
  if (internalOrderFeedback(existing) && body.stepData !== undefined) {
    const incoming = (body.stepData as { internalNaming?: { newNamingFeedback?: unknown } } | null)
      ?.internalNaming?.newNamingFeedback
    if (!(typeof incoming === 'string' && incoming.trim())) out.push(ORDER_KINDS.INTERNAL_NAMING)
  }
  return out
}

/**
 * Of the dropped orders, those the author replaced with something that was
 * NOT made for this brief — the order is cancelled (event `order_cancelled`,
 * the reserve is released; phase 3 tells the team in Slack). Picking what the
 * team made is the normal way an order closes and cancels nothing.
 */
export async function cancelledOrderKinds(
  db: D1Database,
  brandId: string,
  dropped: OrderKind[],
  sel: BriefSelection
): Promise<OrderKind[]> {
  const out: OrderKind[] = []
  for (const kind of dropped) {
    const { table, ids } =
      kind === ORDER_KINDS.CONCEPT
        ? { table: 'concepts', ids: sel.conceptId ? [sel.conceptId] : [] }
        : kind === ORDER_KINDS.EXTERNAL_NAMING
          ? { table: 'external_namings', ids: sel.externalIds }
          : { table: 'internal_namings', ids: sel.internalId ? [sel.internalId] : [] }
    let madeForBrief = false
    if (ids.length > 0) {
      const row = await db
        .prepare(
          `SELECT id FROM ${table} WHERE for_brand_id = ? AND id IN (${ids.map(() => '?').join(',')}) LIMIT 1`
        )
        .bind(brandId, ...ids)
        .first<{ id: string }>()
      madeForBrief = row !== null
    }
    if (!madeForBrief) out.push(kind)
  }
  return out
}

/**
 * Library lists: the wizard asks with `available_for_brand` and sees items made
 * for that brief but not those made for another; the Admin asks with
 * `include_reserved=1` and sees everything. Anyone else sees no reserved item.
 */
export function reserveListFilter(
  alias: string,
  availableForBrand: string | undefined,
  includeReserved: string | undefined
): { sql: string; binds: string[] } {
  if (availableForBrand) {
    return { sql: ` AND (${alias}.for_brand_id IS NULL OR ${alias}.for_brand_id = ?)`, binds: [availableForBrand] }
  }
  if (includeReserved === '1') return { sql: '', binds: [] }
  return { sql: ` AND ${alias}.for_brand_id IS NULL`, binds: [] }
}
