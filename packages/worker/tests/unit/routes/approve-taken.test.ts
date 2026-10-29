import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasNodeSqlite } from '../../helpers/sqliteD1'
import { brandRow, createBrandApp, insertBrand, type BrandApp } from '../../helpers/brandApp'

/**
 * Full run 06.10, bug 4 (H-09): two briefs picked
 * the same concept and name before either was approved; the CEO approved the
 * first, then the second — and the second took the concept over. Approving
 * must refuse what another brand already owns, and two approvals in the same
 * second must not both pass.
 */

const d = hasNodeSqlite ? describe : describe.skip

afterEach(() => {
  vi.unstubAllGlobals()
})

const approve = (app: BrandApp, id: string) =>
  app.request('ceo', 'PATCH', `/api/brands/${id}/status`, { status: 'approved' })

function used(app: BrandApp, table: string, id: string): string | null {
  return (app.db.raw.prepare(`SELECT used_in_brand_id FROM ${table} WHERE id = ?`).get(id) as { used_in_brand_id: string | null })
    .used_in_brand_id
}

function rename(app: BrandApp, id: string, name: string): void {
  app.db.raw.prepare('UPDATE brands SET internal_name = ? WHERE id = ?').run(name, id)
}

// A brief is approved only complete (concept, its External Naming, an Internal
// Naming): a second Internal Naming keeps the other picks the only shared one.
function addInternal(app: BrandApp, id: string, name: string): void {
  app.db.raw.prepare('INSERT INTO internal_namings (id, name, created_by) VALUES (?, ?, ?)').run(id, name, 'usr_admin')
}

d('bug 4: approving does not take what another brand owns', () => {
  it('the same concept and name: the second approval is refused, the first keeps them', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_first', status: 'submitted' })
    insertBrand(app.db, { id: 'b_second', status: 'submitted', created_by: 'usr_po2' })
    rename(app, 'b_first', 'New Brand #103')
    rename(app, 'b_second', 'New Brand #104')

    expect((await approve(app, 'b_first')).status).toBe(200)
    const res = await approve(app, 'b_second')
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe('«Sunrise» уже використано в New Brand #103. Оберіть інше.')

    expect(brandRow(app.db, 'b_second').status).toBe('submitted')
    expect(used(app, 'concepts', 'cpt_sunrise')).toBe('b_first')
    expect(used(app, 'external_namings', 'ext_bubbleton')).toBe('b_first')
    expect(used(app, 'internal_namings', 'int_one')).toBe('b_first')
  })

  it('only the external name is shared: refused, named', async () => {
    const app = createBrandApp()
    addInternal(app, 'int_two', 'Int Two')
    insertBrand(app.db, { id: 'b_first', status: 'submitted', external_naming_ids: ['ext_free'] })
    insertBrand(app.db, { id: 'b_second', status: 'submitted', concept_id: 'cpt_wonka', external_naming_ids: ['ext_free'], internal_naming_id: 'int_two' })
    rename(app, 'b_first', 'New Brand #1')
    expect((await approve(app, 'b_first')).status).toBe(200)
    const res = await approve(app, 'b_second')
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe('«Freebird» уже використано в New Brand #1. Оберіть інше.')
    expect(used(app, 'concepts', 'cpt_wonka')).toBeNull()
  })

  it('only the internal name is shared: refused, named', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_first', status: 'submitted', external_naming_ids: ['ext_sunny'] })
    insertBrand(app.db, { id: 'b_second', status: 'submitted', concept_id: 'cpt_wonka', external_naming_ids: ['ext_wonkaland'] })
    rename(app, 'b_first', 'New Brand #2')
    expect((await approve(app, 'b_first')).status).toBe(200)
    const res = await approve(app, 'b_second')
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: string }).error).toBe('«Int One» уже використано в New Brand #2. Оберіть інше.')
    expect(brandRow(app.db, 'b_second').status).toBe('submitted')
  })

  it('a CEO pick that another brand owns is refused too', async () => {
    const app = createBrandApp()
    addInternal(app, 'int_two', 'Int Two')
    insertBrand(app.db, { id: 'b_owner', status: 'submitted', concept_id: 'cpt_wonka', external_naming_ids: ['ext_wonkaland'], internal_naming_id: 'int_two' })
    insertBrand(app.db, { id: 'b_ceo_pick', status: 'submitted', ceo_selections: { concept: 'cpt_wonka', externalNaming: ['ext_wonkaland'] } })
    rename(app, 'b_owner', 'New Brand #3')
    expect((await approve(app, 'b_owner')).status).toBe(200)
    const res = await approve(app, 'b_ceo_pick')
    expect(res.status).toBe(409)
    expect(brandRow(app.db, 'b_ceo_pick').status).toBe('submitted')
    expect(used(app, 'concepts', 'cpt_wonka')).toBe('b_owner')
  })

  it('two approvals in the same moment: one brand gets the concept, the other is refused', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_a', status: 'submitted' })
    insertBrand(app.db, { id: 'b_b', status: 'submitted', created_by: 'usr_po2' })
    const [a, b] = await Promise.all([approve(app, 'b_a'), approve(app, 'b_b')])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const winner = a.status === 200 ? 'b_a' : 'b_b'
    const loser = winner === 'b_a' ? 'b_b' : 'b_a'
    expect(brandRow(app.db, winner).status).toBe('approved')
    expect(brandRow(app.db, loser).status).toBe('submitted')
    expect(used(app, 'concepts', 'cpt_sunrise')).toBe(winner)
    expect(used(app, 'external_namings', 'ext_bubbleton')).toBe(winner)
  })

  it('an ordinary approval still marks everything as used by the brand', async () => {
    const app = createBrandApp()
    insertBrand(app.db, { id: 'b_only', status: 'submitted' })
    expect((await approve(app, 'b_only')).status).toBe(200)
    expect(brandRow(app.db, 'b_only').status).toBe('approved')
    expect(used(app, 'concepts', 'cpt_sunrise')).toBe('b_only')
    expect(used(app, 'external_namings', 'ext_bubbleton')).toBe('b_only')
    expect(used(app, 'internal_namings', 'int_one')).toBe('b_only')
  })
})
