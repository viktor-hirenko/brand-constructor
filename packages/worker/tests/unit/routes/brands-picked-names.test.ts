import { describe, expect, it } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import { createBrandApp, insertBrand, type BrandApp, type UserKey } from '../../helpers/brandApp'

/**
 * The Brands list says which brand a brief is: with «New Brand #122» come the
 * names of the concept and of the namings it picked (owner, 07.10). Before:
 * only their ids, and the table could show the brief's number alone.
 */

const d = hasNodeSqlite ? describe : describe.skip

interface Row {
  id: string
  conceptName: string | null
  internalNamingName: string | null
  externalNamingNames: string[]
}

async function list(app: BrandApp, user: UserKey): Promise<Row[]> {
  const res = await app.request(user, 'GET', '/api/brands?per_page=500')
  expect(res.status).toBe(200)
  return ((await res.json()) as { data: Row[] }).data
}

d('GET /api/brands: names of what the brief picked', () => {
  it('a concept, an Internal Naming and External Namings in the order they were picked', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_full', external_naming_ids: ['ext_sunny', 'ext_bubbleton'] })
    const [row] = await list(app, 'po')
    expect(row).toMatchObject({
      id: 'b_full',
      conceptName: 'Sunrise',
      internalNamingName: 'Int One',
      externalNamingNames: ['Sunny', 'Bubbleton'],
    })
  })

  it('nothing picked: no names, and the list still comes', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_empty', concept_id: null, internal_naming_id: null, external_naming_ids: [] })
    const [row] = await list(app, 'po')
    expect(row).toMatchObject({ conceptName: null, internalNamingName: null, externalNamingNames: [] })
  })

  it('an External Naming that is gone from the library gives no name instead of an error', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_gone', external_naming_ids: ['ext_deleted', 'ext_sunny'] })
    const [row] = await list(app, 'po')
    expect(row).toMatchObject({ conceptName: 'Sunrise', externalNamingNames: ['Sunny'] })
  })

  // An old brief may keep '' where the ids go: the server reads it as «none»,
  // and naming the picks must not fail the whole table on it.
  it('an empty text instead of the list of External Namings does not fail the table', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_ok' })
    insertBrand(app.db, { id: 'b_blank' })
    app.db.raw.prepare("UPDATE brands SET external_naming_ids = '' WHERE id = 'b_blank'").run()
    const rows = await list(app, 'po')
    expect(rows.find(r => r.id === 'b_blank')).toMatchObject({ conceptName: 'Sunrise', externalNamingNames: [] })
    expect(rows.find(r => r.id === 'b_ok')).toMatchObject({ externalNamingNames: ['Bubbleton'] })
  })
})
