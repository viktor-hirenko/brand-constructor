import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { nextNewBrandName } from '../../../src/utils/brand-number'

/**
 * H-35, run 02.10 (T-082): a new brief was named «New Brand #<briefs + 1>», so
 * after a delete it repeated a name that already existed. The query runs on
 * real SQLite (`node:sqlite`, Node 22.5+) — `SUBSTR`/`CAST`/`LIKE` are what
 * decides the number, a fake would only echo the test.
 */

interface SqliteDb {
  exec(sql: string): void
  prepare(sql: string): {
    run(...a: unknown[]): unknown
    get(...a: unknown[]): Record<string, unknown> | undefined
  }
}

const require = createRequire(import.meta.url)
let DatabaseSync: (new (path: string) => SqliteDb) | null = null
try {
  DatabaseSync = require('node:sqlite').DatabaseSync
} catch {
  DatabaseSync = null
}

function d1With(names: string[]): D1Database {
  const db = new DatabaseSync!(':memory:')
  db.exec('CREATE TABLE brands (id TEXT PRIMARY KEY, internal_name TEXT)')
  names.forEach((n, i) => db.prepare('INSERT INTO brands (id, internal_name) VALUES (?, ?)').run(`b${i}`, n))
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...values: unknown[]) => stmt(sql, values),
    first: async <T>() => (db.prepare(sql).get(...args) ?? null) as T | null,
  })
  return { prepare: (sql: string) => stmt(sql) } as unknown as D1Database
}

describe.skipIf(!DatabaseSync)('the name of a new brief (H-35)', () => {
  it('after a delete it does not repeat an existing name (T-082)', async () => {
    // #2 was deleted: three briefs, the largest number 4. «briefs + 1» gave #4.
    const name = await nextNewBrandName(d1With(['New Brand #1', 'New Brand #3', 'New Brand #4']))
    expect(name).toBe('New Brand #5')
  })

  it('counts numbers as numbers, not as text (#10 is past #9)', async () => {
    expect(await nextNewBrandName(d1With(['New Brand #9', 'New Brand #10']))).toBe('New Brand #11')
  })

  it('briefs renamed to their Internal Naming do not count', async () => {
    expect(await nextNewBrandName(d1With(['Luna', 'New Brand #2', 'Pixi']))).toBe('New Brand #3')
  })

  it('the first brief is #1', async () => {
    expect(await nextNewBrandName(d1With([]))).toBe('New Brand #1')
  })
})
