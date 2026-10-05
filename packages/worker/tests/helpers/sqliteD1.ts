import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

/**
 * A D1 stand-in over Node's built-in SQLite, with the real `schema.sql` — so
 * route tests run the worker's actual SQL (conditional UPDATEs, `meta.changes`,
 * `batch`, JSON functions) instead of a regex fake that knows only the queries
 * it was written for (`pr-package-shared.test.ts`).
 *
 * Every call yields one macrotask first, like a network round trip to D1: two
 * requests started together interleave their reads and writes the way two
 * clicks do in production, which is what the race tests need.
 *
 * `node:sqlite` exists from Node 22.5; on older Node the suites that use this
 * skip instead of failing (`hasNodeSqlite`).
 */

type Row = Record<string, unknown>
type Bindable = string | number | bigint | null | Uint8Array

interface SqliteStatement {
  run(...args: Bindable[]): { changes: number | bigint; lastInsertRowid: number | bigint }
  get(...args: Bindable[]): Row | undefined
  all(...args: Bindable[]): Row[]
}
interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
}

const require = createRequire(import.meta.url)

function loadSqlite(): { DatabaseSync: new (path: string) => SqliteDatabase } | null {
  try {
    return require('node:sqlite')
  } catch {
    return null
  }
}

const sqlite = loadSqlite()
export const hasNodeSqlite = sqlite !== null

const SRC = fileURLToPath(new URL('../../src/', import.meta.url))
export const SCHEMA_SQL = readFileSync(`${SRC}db/schema.sql`, 'utf8')

export function readMigration(name: string): string {
  return readFileSync(`${SRC}db/migrations/${name}`, 'utf8')
}

const tick = () => new Promise<void>(r => setTimeout(r, 0))

function toBindable(value: unknown): Bindable {
  if (value === undefined) throw new Error('D1_TYPE_ERROR: undefined cannot be bound')
  if (typeof value === 'boolean') return value ? 1 : 0
  return value as Bindable
}

class Statement {
  constructor(
    private readonly db: SqliteDatabase,
    readonly sql: string,
    private readonly args: Bindable[] = []
  ) {}

  bind(...values: unknown[]): Statement {
    return new Statement(this.db, this.sql, values.map(toBindable))
  }

  runSync() {
    const res = this.db.prepare(this.sql).run(...this.args)
    return {
      success: true,
      results: [],
      meta: { changes: Number(res.changes), last_row_id: Number(res.lastInsertRowid) },
    }
  }

  async run() {
    await tick()
    return this.runSync()
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    await tick()
    const row = this.db.prepare(this.sql).get(...this.args)
    if (!row) return null
    return (column ? row[column] : { ...row }) as T
  }

  async all<T = Row>() {
    await tick()
    const rows = this.db.prepare(this.sql).all(...this.args)
    return { success: true, results: rows.map(r => ({ ...r })) as T[], meta: { changes: 0 } }
  }
}

export interface TestD1 {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<ReturnType<Statement['runSync']>[]>
  exec(sql: string): Promise<void>
  /** Direct synchronous access for test setup and assertions. */
  raw: SqliteDatabase
}

/** A fresh in-memory database with the project schema applied. */
export function createTestD1(schema = SCHEMA_SQL): TestD1 {
  if (!sqlite) throw new Error('node:sqlite is not available (Node >= 22.5 required)')
  const db = new sqlite.DatabaseSync(':memory:')
  db.exec(schema)
  return {
    raw: db,
    prepare: (sql: string) => new Statement(db, sql),
    // D1 batch: one transaction, all or nothing.
    async batch(statements: Statement[]) {
      await tick()
      db.exec('BEGIN')
      try {
        const results = statements.map(s => s.runSync())
        db.exec('COMMIT')
        return results
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
    async exec(sql: string) {
      await tick()
      db.exec(sql)
    },
  }
}
