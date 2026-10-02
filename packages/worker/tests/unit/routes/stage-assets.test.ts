import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import assets from '../../../src/routes/assets'
import { createTestD1, hasNodeSqlite } from '../../helpers/sqliteD1'

/*
 * The stage shares production's picture bucket: its copied base points at the
 * same files. Deleting a picture on the stage removes the row from the stage's
 * base and must leave the file alone, or production loses the picture.
 */

const d = hasNodeSqlite ? describe : describe.skip

function setup(env: Record<string, string>) {
  const db = createTestD1()
  db.raw
    .prepare("INSERT INTO users (id, email, name, role) VALUES ('usr_admin', 'a@x.test', 'Admin', 'admin')")
    .run()
  db.raw
    .prepare(
      `INSERT INTO assets (id, entity_type, entity_id, file_url, file_name, file_type, aspect_ratio, width, height, file_size)
       VALUES ('ast_1', 'component_thumbnail', 'var_1', '/api/assets/components/var_1/pic.png', 'pic.png', 'image/png', 1, 10, 10, 100)`
    )
    .run()
  const deleted: unknown[] = []
  const bucket = { delete: async (keys: unknown) => void deleted.push(keys) }
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user' as never, { id: 'usr_admin', email: 'a@x.test', name: 'Admin', role: 'admin' } as never)
    await next()
  })
  app.route('/api/assets', assets as never)
  const del = () => app.request('/api/assets/ast_1', { method: 'DELETE' }, { DB: db, ASSETS_BUCKET: bucket, ...env })
  const rows = () => db.raw.prepare('SELECT id FROM assets').all()
  return { del, deleted, rows }
}

d('deleting a picture', () => {
  it('on the stage removes the row and keeps the file in the shared bucket', async () => {
    const t = setup({ SHARED_ASSETS_BUCKET: 'true' })
    expect((await t.del()).status).toBe(200)
    expect(t.rows()).toEqual([])
    expect(t.deleted).toEqual([])
  })

  it('in production removes the file too', async () => {
    const t = setup({})
    expect((await t.del()).status).toBe(200)
    expect(t.rows()).toEqual([])
    expect(t.deleted).toHaveLength(1)
  })
})
