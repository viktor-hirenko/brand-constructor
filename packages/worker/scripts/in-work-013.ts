/**
 * Generates the data file of migration 013 from a fresh read of prod.
 *
 *   npx wrangler d1 execute brand-constructor-db --env production --remote --json \
 *     --command "SELECT id, status, internal_name, concept_id, external_naming_ids, new_concept_brief, new_naming_brief, step_data FROM brands" > brands.json
 *   npx wrangler d1 execute brand-constructor-db --env production --remote --json \
 *     --command "SELECT id, name, concept_id FROM external_namings" > namings.json
 *   pnpm --filter @brand-constructor/worker migrate:013:data brands.json namings.json <out-dir>
 *
 * Writes `<out-dir>/013_in_work_data.sql` and prints the prechecks; anything
 * listed there is shown to the owner before the file is run.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildInWorkDataSql,
  pickInWorkIds,
  precheckInWork,
  rowsFromWranglerJson,
  type MigrationBrandRow,
  type MigrationNamingRow,
} from '../src/db/in-work-013'

const [brandsPath, namingsPath, outDir] = process.argv.slice(2).filter(a => a !== '--')
if (!brandsPath || !namingsPath || !outDir) {
  console.error('usage: in-work-013.ts <brands.json> <namings.json> <out-dir>')
  process.exit(1)
}

const brands = rowsFromWranglerJson<MigrationBrandRow>(JSON.parse(readFileSync(brandsPath, 'utf8')))
const namings = rowsFromWranglerJson<MigrationNamingRow>(JSON.parse(readFileSync(namingsPath, 'utf8')))

const ids = pickInWorkIds(brands)
const outPath = resolve(outDir, '013_in_work_data.sql')
writeFileSync(outPath, buildInWorkDataSql(ids))

const byId = new Map(brands.map(b => [b.id, b]))
console.log(`brands read: ${brands.length}; to move submitted → in_work: ${ids.length}`)
for (const id of ids) console.log(`  ${id}  ${byId.get(id)?.internal_name ?? ''}`)
console.log(JSON.stringify(precheckInWork(brands, namings), null, 2))
console.log(`written: ${outPath}`)
