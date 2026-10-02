#!/usr/bin/env node
// Stage base := a fresh copy of the production base.
//
//   pnpm stage:db:refresh
//
// 1. Exports production (read only) to docs/local/stage/prod-<time>.sql.
// 2. Drops every table of the STAGE base.
// 3. Loads the export into the stage base.
//
// Production is only ever read here: the one command that writes names the
// stage base, and the script refuses to run if that name is not the stage's.
// Pictures are not copied — the stage reads them from production's bucket
// (SHARED_ASSETS_BUCKET in packages/worker/wrangler.toml).

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workerDir = resolve(repoRoot, 'packages/worker')
const PROD_DB = 'brand-constructor-db'
const STAGE_DB = 'brand-constructor-db-stage'

function wrangler(args, opts = {}) {
  return execFileSync('npx', ['wrangler', ...args], {
    cwd: workerDir,
    encoding: 'utf8',
    stdio: opts.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
}

function onStage(args) {
  if (!args.includes(STAGE_DB) || args.includes(PROD_DB)) {
    throw new Error(`refusing to write anywhere but ${STAGE_DB}`)
  }
  return wrangler([...args, '--env', 'stage', '--remote'], { capture: args.includes('--json') })
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = resolve(repoRoot, 'docs/local/stage')
mkdirSync(outDir, { recursive: true })
const dump = resolve(outDir, `prod-${stamp}.sql`)

console.log(`\n> export production → ${dump}`)
wrangler(['d1', 'export', PROD_DB, '--env', 'production', '--remote', '--output', dump])

// Tables parents-first. Where references loop (a brief points at its concept;
// a concept made for an order points at the brief) the loop is broken: those
// columns are `deferred` — written NULL first and filled in, or cleared, apart.
function insertOrder(db) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY rowid")
    .all()
    .map(r => r.name)
  const parents = new Map(
    tables.map(t => [
      t,
      db.prepare(`PRAGMA foreign_key_list("${t}")`).all().map(f => ({ table: f.table, column: f.from })),
    ])
  )
  const placed = []
  const deferred = new Map() // table → columns written apart
  const left = new Set(tables)
  while (left.size > 0) {
    const unmet = t => parents.get(t).filter(f => f.table !== t && left.has(f.table))
    let next = [...left].find(t => unmet(t).length === 0)
    if (!next) {
      next = [...left].sort((a, b) => unmet(a).length - unmet(b).length)[0]
      deferred.set(next, unmet(next).map(f => f.column))
    }
    placed.push(next)
    left.delete(next)
  }
  return { placed, deferred }
}

console.log(`\n> drop the stage tables`)
// Dropping a table deletes its rows, and D1 checks every reference as it goes:
// the loop columns are cleared first, then tables go children-first.
const listed = JSON.parse(
  onStage([
    'd1',
    'execute',
    STAGE_DB,
    '--json',
    '--command',
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'",
  ])
)
const stageSchema = (listed[0]?.results ?? []).map(r => `${r.sql};`)
if (stageSchema.length > 0) {
  const shape = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false })
  shape.exec(stageSchema.join('\n'))
  const { placed, deferred } = insertOrder(shape)
  const clear = [...deferred].map(([t, cols]) => `UPDATE "${t}" SET ${cols.map(c => `"${c}" = NULL`).join(', ')};`)
  const drops = resolve(outDir, `stage-drop-${stamp}.sql`)
  writeFileSync(
    drops,
    [
      'PRAGMA defer_foreign_keys = TRUE;',
      ...clear,
      ...[...placed].reverse().map(t => `DROP TABLE IF EXISTS "${t}";`),
    ].join('\n') + '\n'
  )
  onStage(['d1', 'execute', STAGE_DB, '--file', drops, '--yes'])
}

// Cloudflare's import checks every reference row by row, and production has
// a loop (a brief points at its concept; a concept made for an order points
// at the brief), so no order of the export's rows loads. The copy is opened
// locally instead and written back: tables, then rows parents-first, with the
// references that close a loop filled in by UPDATEs at the end, then indexes.
function loadScript(dumpSql) {
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false })
  db.exec(dumpSql.replace(/^PRAGMA[^;]*;/gim, ''))
  const objects = db
    .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    .all()
  const { placed, deferred } = insertOrder(db)

  const literal = v =>
    v === null || v === undefined
      ? 'NULL'
      : typeof v === 'number' || typeof v === 'bigint'
        ? String(v)
        : v instanceof Uint8Array
          ? `X'${Buffer.from(v).toString('hex')}'`
          : `'${String(v).replace(/'/g, "''")}'`

  const out = ['PRAGMA defer_foreign_keys = TRUE;']
  for (const o of objects) if (o.type === 'table') out.push(`${o.sql};`)
  const later = []
  for (const t of placed) {
    const cols = db.prepare(`PRAGMA table_info("${t}")`).all().map(c => c.name)
    const hold = deferred.get(t) ?? []
    for (const row of db.prepare(`SELECT * FROM "${t}"`).all()) {
      const values = cols.map(c => (hold.includes(c) ? 'NULL' : literal(row[c])))
      out.push(`INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(',')}) VALUES(${values.join(',')});`)
      for (const c of hold) {
        if (row[c] == null) continue
        const pk = cols.includes('id') ? 'id' : 'rowid'
        later.push(`UPDATE "${t}" SET "${c}" = ${literal(row[c])} WHERE "${pk}" = ${literal(row[pk])};`)
      }
    }
  }
  out.push(...later)
  for (const o of objects) if (o.type !== 'table') out.push(`${o.sql};`)
  return out.join('\n') + '\n'
}

const load = resolve(outDir, `stage-load-${stamp}.sql`)
writeFileSync(load, loadScript(readFileSync(dump, 'utf8')))

console.log(`\n> load the copy into the stage`)
onStage(['d1', 'execute', STAGE_DB, '--file', load, '--yes'])

console.log(`\n✓ stage base = production as of ${stamp}`)
