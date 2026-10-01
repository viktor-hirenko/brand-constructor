import { describe, expect, it } from 'vitest'
import { brandHasNewBriefsFromRow } from '@brand-constructor/shared'
import {
  buildInWorkDataSql,
  pickInWorkIds,
  precheckInWork,
  rowsFromWranglerJson,
  type MigrationBrandRow,
} from '../../../src/db/in-work-013'
import { SCHEMA_SQL, createTestD1, hasNodeSqlite, readMigration } from '../../helpers/sqliteD1'

/**
 * Migration 013 (brief-orders plan, phase 1): `submitted` briefs that carry an
 * order become `in_work`. The ids are picked in JS by the same function the
 * worker uses, because SQLite's TRIM keeps the newline JS `.trim()` drops and
 * `json_extract` aborts on broken JSON.
 */

const d = hasNodeSqlite ? describe : describe.skip

function row(over: Partial<MigrationBrandRow> & { id: string }): MigrationBrandRow {
  return {
    status: 'submitted',
    new_concept_brief: null,
    new_naming_brief: null,
    step_data: null,
    ...over,
  }
}

describe('which submitted briefs move to in_work', () => {
  const rows: MigrationBrandRow[] = [
    row({ id: 'concept_order', new_concept_brief: '{"a":1}' }),
    row({ id: 'naming_order', new_naming_brief: '{"a":1}' }),
    row({ id: 'internal_order', step_data: '{"internalNaming":{"newNamingFeedback":"short"}}' }),
    row({ id: 'internal_newline_only', step_data: '{"internalNaming":{"newNamingFeedback":"\\n"}}' }),
    row({ id: 'broken_step_data', step_data: '{not json' }),
    row({ id: 'null_step_data', step_data: null }),
    row({ id: 'no_order' }),
    row({ id: 'draft_with_order', status: 'draft', new_concept_brief: '{"a":1}' }),
    row({ id: 'string_null_order', new_concept_brief: 'null' }),
  ]

  it('exactly what the worker calls «has an order», only among submitted', () => {
    expect(pickInWorkIds(rows)).toEqual(['concept_order', 'naming_order', 'internal_order', 'string_null_order'])
    for (const r of rows.filter(r => r.status === 'submitted')) {
      expect(pickInWorkIds([r]).length === 1).toBe(brandHasNewBriefsFromRow(r))
    }
  })

  it('prechecks flag what must be shown to the owner before the run', () => {
    const pre = precheckInWork(
      [
        ...rows,
        row({ id: 'foreign', concept_id: 'cpt_b', external_naming_ids: '["ext_a"]' }),
      ],
      [{ id: 'ext_a', name: 'Alpha', concept_id: 'cpt_a' }]
    )
    expect(pre.brokenStepData).toEqual(['broken_step_data'])
    expect(pre.nullishOrders).toEqual(['string_null_order'])
    expect(pre.ordersOutsideSubmitted).toEqual([{ id: 'draft_with_order', status: 'draft' }])
    expect(pre.foreignNamings).toEqual([{ id: 'foreign', status: 'submitted', names: ['Alpha'] }])
  })

  it('reads `wrangler d1 execute --json` output', () => {
    expect(rowsFromWranglerJson([{ results: [{ id: 'a' }], success: true }])).toEqual([{ id: 'a' }])
    expect(rowsFromWranglerJson([{ id: 'b' }])).toEqual([{ id: 'b' }])
  })

  it('an empty list writes a no-op file', () => {
    expect(buildInWorkDataSql([])).not.toMatch(/UPDATE/)
  })
})

/** The schema as prod has it before 013: without the five new columns. */
function schemaBefore013(): string {
  const out = SCHEMA_SQL.replace(
    /\n\s*(sent_to_work_at|orders_ready_at|orders_ready_by|orders_slack_channel|orders_slack_ts) TEXT,/g,
    ''
  ).replace(/\n\s*FOREIGN KEY \(orders_ready_by\) REFERENCES users\(id\),/, '')
  expect(out).not.toMatch(/sent_to_work_at/)
  return out
}

d('013 on a real SQLite', () => {
  function setup() {
    const db = createTestD1(schemaBefore013())
    db.raw.exec(readMigration('013_in_work_status.sql'))
    db.raw.exec(`INSERT INTO users (id, email, name, role) VALUES ('u', 'u@x', 'U', 'product_owner')`)
    const b = db.raw.prepare(
      `INSERT INTO brands (id, status, created_by, new_concept_brief, step_data, submit_count, submitted_at)
       VALUES (?, ?, 'u', ?, ?, ?, ?)`
    )
    b.run('in_work_one', 'submitted', '{"a":1}', null, 1, '2026-09-30T10:00:00.000Z')
    b.run('ready_for_ceo', 'submitted', null, null, 1, '2026-09-29T10:00:00.000Z')
    b.run('resubmitted_order', 'submitted', '{"a":1}', null, 2, '2026-09-28T10:00:00.000Z')
    const e = db.raw.prepare(
      `INSERT INTO brand_workflow_events (id, brand_id, event_type, user_id, created_at) VALUES (?, ?, ?, 'u', ?)`
    )
    e.run('e1', 'in_work_one', 'submitted', '2026-09-30T10:00:00.000Z')
    e.run('e2', 'resubmitted_order', 'submitted', '2026-09-20T10:00:00.000Z')
    e.run('e3', 'resubmitted_order', 'submitted', '2026-09-28T10:00:00.000Z')
    e.run('e4', 'ready_for_ceo', 'submitted', '2026-09-29T10:00:00.000Z')
    return db
  }

  const get = (db: ReturnType<typeof createTestD1>, id: string) =>
    db.raw.prepare('SELECT status, submit_count, sent_to_work_at FROM brands WHERE id = ?').get(id)
  const events = (db: ReturnType<typeof createTestD1>) =>
    db.raw.prepare('SELECT id, event_type FROM brand_workflow_events ORDER BY id').all()

  it('adds the columns and moves only the listed briefs; the latest submission becomes «sent to work»', () => {
    const db = setup()
    const sql = buildInWorkDataSql(['in_work_one', 'resubmitted_order'])
    db.raw.exec(sql)
    expect(get(db, 'in_work_one')).toEqual({ status: 'in_work', submit_count: 0, sent_to_work_at: '2026-09-30T10:00:00.000Z' })
    expect(get(db, 'resubmitted_order')).toEqual({ status: 'in_work', submit_count: 1, sent_to_work_at: '2026-09-28T10:00:00.000Z' })
    expect(get(db, 'ready_for_ceo')).toEqual({ status: 'submitted', submit_count: 1, sent_to_work_at: null })
    expect(events(db)).toEqual([
      { id: 'e1', event_type: 'sent_to_work' },
      { id: 'e2', event_type: 'submitted' },
      { id: 'e3', event_type: 'sent_to_work' },
      { id: 'e4', event_type: 'submitted' },
    ])

    // a second run changes nothing
    db.raw.exec(sql)
    expect(get(db, 'resubmitted_order')).toEqual({ status: 'in_work', submit_count: 1, sent_to_work_at: '2026-09-28T10:00:00.000Z' })
    expect(events(db).map(r => (r as { event_type: string }).event_type)).toEqual([
      'sent_to_work',
      'submitted',
      'sent_to_work',
      'submitted',
    ])
  })

  it('013_down: in work with an order → submitted again, without one → draft', () => {
    const db = setup()
    db.raw.exec(buildInWorkDataSql(['in_work_one', 'resubmitted_order']))
    // after release: the author swapped the order of one brief for library picks
    db.raw.exec(`UPDATE brands SET new_concept_brief = NULL WHERE id = 'resubmitted_order'`)
    db.raw.exec(readMigration('013_down.sql'))
    expect(get(db, 'in_work_one')).toMatchObject({ status: 'submitted', submit_count: 1 })
    expect(get(db, 'resubmitted_order')).toMatchObject({ status: 'draft', submit_count: 1 })
    expect(
      db.raw.prepare("SELECT COUNT(*) AS n FROM brand_workflow_events WHERE event_type = 'sent_to_work'").get()
    ).toEqual({ n: 0 })
  })

  it('013_down survives a broken step_data', () => {
    const db = setup()
    db.raw.exec(`UPDATE brands SET status = 'in_work', step_data = '{broken', new_concept_brief = NULL WHERE id = 'in_work_one'`)
    db.raw.exec(readMigration('013_down.sql'))
    expect(get(db, 'in_work_one')).toMatchObject({ status: 'draft' })
  })
})
