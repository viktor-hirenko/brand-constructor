import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { requireLibraryAccess } from '../middleware/auth'
import { generateId } from '../utils/id'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

const createTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  sort_order: z.number().int().min(0).default(0),
})

const createVariantSchema = z.object({
  name: z.string().min(1).max(200),
  variant_number: z.number().int().min(1).optional(),
})

const updateVariantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  variant_number: z.number().int().min(1).optional(),
  thumbnail_url: z.string().nullable().optional(),
  preview_url: z.string().nullable().optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
})

// --- Component Types ---

app.get('/types', async c => {
  const types = await c.env.DB.prepare(
    'SELECT * FROM component_types ORDER BY sort_order ASC'
  ).all()

  const typesWithCounts = await Promise.all(
    types.results.map(async t => {
      const count = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM component_variants WHERE component_type_id = ?'
      )
        .bind(t.id)
        .first<{ total: number }>()
      return { ...t, variant_count: count?.total || 0 }
    })
  )

  return c.json({ success: true, data: typesWithCounts })
})

app.post('/types', requireLibraryAccess('component_types'), async c => {
  const body = await c.req.json()
  const parsed = createTypeSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const id = generateId('ctp')

  await c.env.DB.prepare(
    'INSERT INTO component_types (id, name, description, sort_order) VALUES (?, ?, ?, ?)'
  )
    .bind(id, parsed.data.name, parsed.data.description, parsed.data.sort_order)
    .run()

  const type = await c.env.DB.prepare('SELECT * FROM component_types WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: type }, 201)
})

// --- Component Variants ---

app.get('/types/:typeId/variants', async c => {
  const typeId = c.req.param('typeId')
  const status = c.req.query('status') || 'active'

  const type = await c.env.DB.prepare('SELECT * FROM component_types WHERE id = ?')
    .bind(typeId)
    .first()
  if (!type) {
    return c.json({ success: false, error: 'Component type not found' }, 404)
  }

  let variantQuery: string
  let variantParams: (string | number)[]

  if (status === 'all') {
    variantQuery = `SELECT cv.*, u.name as author_name, COALESCE(b.internal_name, cv.used_in_brand_id) as brand_name
     FROM component_variants cv
     LEFT JOIN users u ON cv.created_by = u.id
     LEFT JOIN brands b ON cv.used_in_brand_id = b.id
     WHERE cv.component_type_id = ?
     ORDER BY cv.variant_number ASC`
    variantParams = [typeId]
  } else {
    variantQuery = `SELECT cv.*, u.name as author_name, COALESCE(b.internal_name, cv.used_in_brand_id) as brand_name
     FROM component_variants cv
     LEFT JOIN users u ON cv.created_by = u.id
     LEFT JOIN brands b ON cv.used_in_brand_id = b.id
     WHERE cv.component_type_id = ? AND cv.status = ?
     ORDER BY cv.variant_number ASC`
    variantParams = [typeId, status]
  }

  const variants = await c.env.DB.prepare(variantQuery)
    .bind(...variantParams)
    .all()

  return c.json({ success: true, data: { type, variants: variants.results } })
})

app.post('/types/:typeId/variants', requireLibraryAccess('component_variants'), async c => {
  const typeId = c.req.param('typeId')
  const body = await c.req.json()
  const parsed = createVariantSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const type = await c.env.DB.prepare('SELECT * FROM component_types WHERE id = ?')
    .bind(typeId)
    .first()
  if (!type) {
    return c.json({ success: false, error: 'Component type not found' }, 404)
  }

  let variantNumber = parsed.data.variant_number
  if (!variantNumber) {
    const maxNum = await c.env.DB.prepare(
      'SELECT MAX(variant_number) as max_num FROM component_variants WHERE component_type_id = ?'
    )
      .bind(typeId)
      .first<{ max_num: number | null }>()
    variantNumber = (maxNum?.max_num || 0) + 1
  }

  const user = c.get('user')
  const id = generateId('cvr')

  await c.env.DB.prepare(
    'INSERT INTO component_variants (id, component_type_id, name, variant_number, created_by) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, typeId, parsed.data.name, variantNumber, user.id)
    .run()

  const variant = await c.env.DB.prepare('SELECT * FROM component_variants WHERE id = ?')
    .bind(id)
    .first()
  return c.json({ success: true, data: variant }, 201)
})

app.put('/variants/:id', requireLibraryAccess('component_variants'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateVariantSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM component_variants WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'Component variant not found' }, 404)
  }

  const updates: string[] = []
  const values: (string | null | number)[] = []

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      values.push(value as string | null | number)
    }
  }

  if (updates.length === 0) {
    return c.json({ success: true, data: existing })
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  await c.env.DB.prepare(`UPDATE component_variants SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM component_variants WHERE id = ?')
    .bind(id)
    .first()
  return c.json({ success: true, data: updated })
})

app.delete('/variants/:id', requireLibraryAccess('component_variants'), async c => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT * FROM component_variants WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'Component variant not found' }, 404)
  }

  await c.env.DB.prepare('DELETE FROM component_variants WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { deleted: true } })
})

export default app
