import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { requireLibraryAccess } from '../middleware/auth'
import { generateId } from '../utils/id'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

const createSchema = z.object({
  number: z.number().int().min(0).max(10),
  name: z.string().min(1).max(300),
  description: z.string().max(5000).default(''),
  teams_involved: z.string().max(2000).default(''),
  requirements: z.string().max(5000).default(''),
  goals: z.string().max(5000).default(''),
  components_list: z.string().max(5000).default(''),
  timeline: z.string().max(1000).default(''),
  expenses: z.string().max(2000).default(''),
})

const updateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  teams_involved: z.string().max(2000).optional(),
  requirements: z.string().max(5000).optional(),
  goals: z.string().max(5000).optional(),
  components_list: z.string().max(5000).optional(),
  timeline: z.string().max(1000).optional(),
  expenses: z.string().max(2000).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
})

app.get('/', async c => {
  const packages = await c.env.DB.prepare(
    `SELECT p.*, u.name as author_name
     FROM pr_packages p
     LEFT JOIN users u ON p.created_by = u.id
     ORDER BY p.number ASC`
  ).all()

  return c.json({ success: true, data: packages.results })
})

app.get('/:id', async c => {
  const id = c.req.param('id')

  const pkg = await c.env.DB.prepare(
    `SELECT p.*, u.name as author_name
     FROM pr_packages p
     LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = ?`
  )
    .bind(id)
    .first()

  if (!pkg) {
    return c.json({ success: false, error: 'PR package not found' }, 404)
  }

  return c.json({ success: true, data: pkg })
})

app.post('/', requireLibraryAccess('pr_packages'), async c => {
  const body = await c.req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const exists = await c.env.DB.prepare('SELECT id FROM pr_packages WHERE number = ?')
    .bind(parsed.data.number)
    .first()

  if (exists) {
    return c.json(
      { success: false, error: `PR package #${parsed.data.number} already exists` },
      409
    )
  }

  const user = c.get('user')
  const id = generateId('prp')

  await c.env.DB.prepare(
    `INSERT INTO pr_packages (id, number, name, description, teams_involved, requirements, goals, components_list, timeline, expenses, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      parsed.data.number,
      parsed.data.name,
      parsed.data.description,
      parsed.data.teams_involved,
      parsed.data.requirements,
      parsed.data.goals,
      parsed.data.components_list,
      parsed.data.timeline,
      parsed.data.expenses,
      user.id
    )
    .run()

  const pkg = await c.env.DB.prepare('SELECT * FROM pr_packages WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: pkg }, 201)
})

app.put('/:id', requireLibraryAccess('pr_packages'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM pr_packages WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ success: false, error: 'PR package not found' }, 404)
  }

  if (existing.used_in_brand_id) {
    return c.json(
      { success: false, error: 'Cannot edit: PR package is used in an approved brand' },
      409
    )
  }

  const updates: string[] = []
  const values: (string | null)[] = []

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      values.push(value as string | null)
    }
  }

  if (updates.length === 0) {
    return c.json({ success: true, data: existing })
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  await c.env.DB.prepare(`UPDATE pr_packages SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM pr_packages WHERE id = ?').bind(id).first()
  return c.json({ success: true, data: updated })
})

app.delete('/:id', requireLibraryAccess('pr_packages'), async c => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT * FROM pr_packages WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ success: false, error: 'PR package not found' }, 404)
  }

  if (existing.used_in_brand_id) {
    return c.json(
      { success: false, error: 'Cannot delete: PR package is used in an approved brand' },
      409
    )
  }

  const usedInBrand = await c.env.DB.prepare(
    'SELECT id FROM brands WHERE pr_package_id = ? LIMIT 1'
  )
    .bind(id)
    .first()

  if (usedInBrand) {
    return c.json(
      { success: false, error: 'Cannot delete: PR package is referenced by a brand' },
      409
    )
  }

  await c.env.DB.prepare('DELETE FROM pr_packages WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { deleted: true } })
})

export default app
