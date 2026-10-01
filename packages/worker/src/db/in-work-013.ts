import { brandHasNewBriefsFromRow } from '@brand-constructor/shared'

/**
 * Data half of migration 013: which `submitted` briefs are really «in work»
 * (they carry an order) and the SQL that moves them to `in_work`.
 *
 * The decision is made here, in JS, with the worker's own
 * `brandHasNewBriefsFromRow` — not in SQL — because SQLite `TRIM` strips only
 * spaces while JS `.trim()` also strips newlines, and `json_extract` aborts the
 * whole run on one broken `step_data`. The ids are then written into the SQL
 * literally, so what runs on prod is exactly what was reviewed.
 */

export interface MigrationBrandRow {
  id: string
  status: string
  internal_name?: string | null
  concept_id?: string | null
  external_naming_ids?: string | null
  new_concept_brief: string | null
  new_naming_brief: string | null
  step_data: string | null
}

export interface MigrationNamingRow {
  id: string
  name: string
  concept_id: string | null
}

export function pickInWorkIds(rows: MigrationBrandRow[]): string[] {
  return rows
    .filter(r => r.status === 'submitted' && brandHasNewBriefsFromRow(r))
    .map(r => r.id)
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Re-runnable: a brief already moved is no longer `submitted`, and its event is
 * rewritten only while the brief has no `sent_to_work` event yet.
 */
export function buildInWorkDataSql(ids: string[]): string {
  if (ids.length === 0) return '-- 013 data: no submitted brief carries an order — nothing to move.\n'
  const list = ids.map(sqlString).join(', ')
  return `-- 013 data: ${ids.length} brief(s) «submitted» with an order → in_work.
UPDATE brands
SET status = 'in_work',
    sent_to_work_at = submitted_at,
    submit_count = MAX(0, submit_count - 1)
WHERE id IN (${list}) AND status = 'submitted';

UPDATE brand_workflow_events
SET event_type = 'sent_to_work'
WHERE id IN (
  SELECT e.id FROM brand_workflow_events e
  WHERE e.brand_id IN (${list})
    AND e.event_type = 'submitted'
    AND e.created_at = (
      SELECT MAX(x.created_at) FROM brand_workflow_events x
      WHERE x.brand_id = e.brand_id AND x.event_type = 'submitted'
    )
    AND NOT EXISTS (
      SELECT 1 FROM brand_workflow_events y
      WHERE y.brand_id = e.brand_id AND y.event_type = 'sent_to_work'
    )
)
AND brand_id IN (SELECT id FROM brands WHERE status = 'in_work');
`
}

export interface InWorkPrecheck {
  /** `step_data` that is not JSON — such a brief counts as "no internal order". */
  brokenStepData: string[]
  /** An order column holding the string `'null'` or `''` — counts as an order in JS. */
  nullishOrders: string[]
  /** Drafts and returned briefs that already carry an order (not moved; shown for the record). */
  ordersOutsideSubmitted: { id: string; status: string }[]
  /** Briefs whose External Naming belongs to another concept — would be refused at send/approve. */
  foreignNamings: { id: string; status: string; names: string[] }[]
}

export function precheckInWork(
  rows: MigrationBrandRow[],
  namings: MigrationNamingRow[]
): InWorkPrecheck {
  const namingById = new Map(namings.map(n => [n.id, n]))
  const out: InWorkPrecheck = {
    brokenStepData: [],
    nullishOrders: [],
    ordersOutsideSubmitted: [],
    foreignNamings: [],
  }
  for (const r of rows) {
    if (r.step_data) {
      try {
        JSON.parse(r.step_data)
      } catch {
        out.brokenStepData.push(r.id)
      }
    }
    if ([r.new_concept_brief, r.new_naming_brief].some(v => v === 'null' || v === '')) {
      out.nullishOrders.push(r.id)
    }
    if ((r.status === 'draft' || r.status === 'needs_revision') && brandHasNewBriefsFromRow(r)) {
      out.ordersOutsideSubmitted.push({ id: r.id, status: r.status })
    }
    if (r.status !== 'draft' && r.concept_id) {
      let extIds: string[] = []
      try {
        extIds = JSON.parse(r.external_naming_ids || '[]')
      } catch {
        extIds = []
      }
      const foreign = extIds
        .map(id => namingById.get(id))
        .filter((n): n is MigrationNamingRow => !!n && !!n.concept_id && n.concept_id !== r.concept_id)
        .map(n => n.name)
      if (foreign.length > 0) out.foreignNamings.push({ id: r.id, status: r.status, names: foreign })
    }
  }
  return out
}

/** `wrangler d1 execute --json` prints `[{ results: [...] }]`; a plain row array is accepted too. */
export function rowsFromWranglerJson<T>(parsed: unknown): T[] {
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object' && 'results' in parsed[0]) {
    return (parsed as { results: T[] }[]).flatMap(p => p.results)
  }
  return Array.isArray(parsed) ? (parsed as T[]) : []
}
