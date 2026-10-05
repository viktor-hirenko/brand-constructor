import { brandHasNewBriefsFromRow } from '@brand-constructor/shared'
import { asIdArray, firstId, type BrandRow, type UpdateBrandBody } from './brands'

/**
 * Server-side checks a brief must pass before it reaches the CEO or is approved
 * (brief-orders plan, phase 1; holes H-01, H-02, H-15 in
 * `docs/design-audit/brief-holes.md`). The wizard has its own checks, but a
 * stale tab, a «назад» in the middle of an edit or a direct request skips them —
 * so the server decides. Messages are in Ukrainian: the wizard shows them as is.
 */

export interface BriefSelection {
  conceptId: string | null
  externalIds: string[]
  internalId: string | null
}

export function selectionFromRow(row: BrandRow): BriefSelection {
  return {
    conceptId: row.concept_id || null,
    externalIds: parseIdList(row.external_naming_ids),
    internalId: row.internal_naming_id || null,
  }
}

/**
 * What approval would write: a CEO pick replaces the author's in its section,
 * the author's choice stays everywhere else (same rule as the approve batch).
 */
export function finalSelection(
  row: BrandRow,
  ceoSelections: Record<string, string | string[]>
): BriefSelection {
  const own = selectionFromRow(row)
  const ceoExt = asIdArray(ceoSelections.externalNaming)
  return {
    conceptId: firstId(ceoSelections.concept) || own.conceptId,
    externalIds: ceoExt.length > 0 ? ceoExt : own.externalIds,
    internalId: firstId(ceoSelections.internalNaming) || own.internalId,
  }
}

function parseIdList(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string' && v !== '') : []
  } catch {
    return []
  }
}

/** A concurrent request changed the brief's status first (H-23). */
export const BRIEF_CHANGED_MESSAGE = 'Бриф змінено — оновіть сторінку.'

/** The tab still shows the order waiting for the team; the team has sent it (H-31). */
export const ORDER_SENT_RELOAD_MESSAGE = 'Замовлення вже відправлено замовнику — оновіть сторінку.'

/**
 * Why a save from a stale tab is refused. «Відправити замовнику» stamps
 * `updated_at` with its own time, so when that is the last change the tab
 * missed, it hears what happened (H-31, D-65), not just «reload».
 */
export function staleTabMessage(row: Pick<BrandRow, 'updated_at' | 'orders_ready_at'>): string {
  return row.orders_ready_at && row.orders_ready_at === row.updated_at
    ? ORDER_SENT_RELOAD_MESSAGE
    : BRIEF_CHANGED_MESSAGE
}

export const BRIEF_HAS_ORDERS_MESSAGE =
  'У брифі є замовлення. Спершу оберіть замовлене з бібліотеки, потім відправляйте CEO.'

/** True while the brief still carries an order the teams have to fulfil. */
export function briefHasOrders(row: BrandRow): boolean {
  return brandHasNewBriefsFromRow(row)
}

/**
 * A brief goes to the CEO, and is approved, only with a concept, at least one
 * External Naming of THAT concept, and an Internal Naming — all from the
 * library. Returns the message to show, or `null` when the brief is complete.
 *
 * A naming with no concept at all is not "another concept's" naming: older
 * library rows carry `concept_id = NULL`, and refusing them would block briefs
 * that were valid when they were filled in.
 */
export async function validateBriefCompleteness(
  db: D1Database,
  sel: BriefSelection
): Promise<string | null> {
  if (!sel.conceptId) return 'Бриф неповний: оберіть концепт.'
  if (sel.externalIds.length === 0) return 'Бриф неповний: оберіть хоча б один External Naming.'
  if (!sel.internalId) return 'Бриф неповний: оберіть Internal Naming.'

  const concept = await db
    .prepare('SELECT id, name FROM concepts WHERE id = ?')
    .bind(sel.conceptId)
    .first<{ id: string; name: string }>()
  if (!concept) return 'Обраного концепту немає в бібліотеці. Оберіть концепт знову.'

  const placeholders = sel.externalIds.map(() => '?').join(',')
  const namings = await db
    .prepare(`SELECT id, name, concept_id FROM external_namings WHERE id IN (${placeholders})`)
    .bind(...sel.externalIds)
    .all<{ id: string; name: string; concept_id: string | null }>()
  const found = new Map(namings.results.map(n => [n.id, n]))
  for (const id of sel.externalIds) {
    const naming = found.get(id)
    if (!naming) return 'Обраного External Naming немає в бібліотеці. Оберіть назви знову.'
    if (naming.concept_id && naming.concept_id !== concept.id) {
      return `External Naming «${naming.name}» належить іншому концепту. Оберіть назви для концепту «${concept.name}».`
    }
  }

  const internal = await db
    .prepare('SELECT id FROM internal_namings WHERE id = ?')
    .bind(sel.internalId)
    .first<{ id: string }>()
  if (!internal) return 'Обраного Internal Naming немає в бібліотеці. Оберіть назву знову.'

  return null
}

/** Key-order-independent JSON, so a round-tripped order compares equal to the stored one. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function storedJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function storedInternalFeedback(raw: string | null): string {
  const stepData = storedJson(raw) as { internalNaming?: { newNamingFeedback?: unknown } } | null
  const feedback = stepData?.internalNaming?.newNamingFeedback
  return typeof feedback === 'string' ? feedback.trim() : ''
}

/**
 * While a brief is `in_work` the teams are already working from its order, so
 * the author may only DROP an order (by picking from the library instead) —
 * never add one or change its answers — and may not switch light/dark, which
 * the designers received. Everything else the wizard sends is the same data
 * round-tripped and passes. Returns the message to show, or `null`.
 */
export function checkInWorkEdit(existing: BrandRow, body: UpdateBrandBody): string | null {
  if (body.mode !== undefined && (body.mode ?? 'light') !== (existing.mode ?? 'light')) {
    return 'Бриф уже в роботі: режим light/dark змінити не можна.'
  }

  const orderChanged = (incoming: unknown, stored: string | null) =>
    incoming !== undefined && incoming !== null && stableJson(incoming) !== stableJson(storedJson(stored))

  if (orderChanged(body.newConceptBrief, existing.new_concept_brief)) {
    return 'Бриф уже в роботі: замовлення концепту не можна додати чи змінити — його отримала команда.'
  }
  if (orderChanged(body.newNamingBrief, existing.new_naming_brief)) {
    return 'Бриф уже в роботі: замовлення назви не можна додати чи змінити — його отримала команда.'
  }

  if (body.stepData !== undefined) {
    const incoming = (body.stepData as { internalNaming?: { newNamingFeedback?: unknown } } | null)
      ?.internalNaming?.newNamingFeedback
    const next = typeof incoming === 'string' ? incoming.trim() : ''
    if (next && next !== storedInternalFeedback(existing.step_data)) {
      return 'Бриф уже в роботі: замовлення Internal Naming не можна додати чи змінити — його отримала команда.'
    }
  }

  return null
}
