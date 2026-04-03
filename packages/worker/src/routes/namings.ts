import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { requireLibraryAccess } from '../middleware/auth'
import { generateId } from '../utils/id'
import {
  checkDomainAvailability,
  updateNamingDomainStatus,
  shouldRecheck,
  isPananamesConfigured,
} from '../utils/domain-check'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

const createExternalSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  domain: z.string().max(255).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  availability_status: z.enum(['available', 'sold', 'unknown']).nullable().optional(),
  domain_check_source: z.enum(['manual', 'pananames', 'admin_override']).nullable().optional(),
  concept_id: z.string().nullable().optional(),
})

const createInternalSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
})

const updateExternalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).optional(),
  domain: z.string().max(255).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  availability_status: z.enum(['available', 'sold', 'unknown']).nullable().optional(),
  domain_check_source: z.enum(['manual', 'pananames', 'admin_override']).nullable().optional(),
  concept_id: z.string().nullable().optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
})

const updateInternalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
})

const previewDomainSchema = z.object({
  domain: z.string().min(1).max(255),
})

// --- External Namings ---

app.get('/external', async c => {
  const status = c.req.query('status') || 'active'
  const conceptId = c.req.query('concept_id')
  const filter = c.req.query('filter') // 'all' | 'linked' | 'standalone'
  const availableForBrand = c.req.query('available_for_brand')
  const page = parseInt(c.req.query('page') || '1')
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
  const offset = (page - 1) * perPage

  let where = '1=1'
  const params: (string | number)[] = []

  if (availableForBrand) {
    where += ' AND ((en.status = ? AND en.used_in_brand_id IS NULL) OR en.used_in_brand_id = ?)'
    params.push('active', availableForBrand)
  } else if (status && status !== 'all') {
    where += ' AND en.status = ?'
    params.push(status)
  }

  if (conceptId) {
    where += ' AND en.concept_id = ?'
    params.push(conceptId)
  } else if (filter === 'linked') {
    where += ' AND en.concept_id IS NOT NULL'
  } else if (filter === 'standalone') {
    where += ' AND en.concept_id IS NULL'
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM external_namings en WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>()

  const namings = await c.env.DB.prepare(
    `SELECT en.*, u.name as author_name, c.name as concept_name, COALESCE(b.internal_name, en.used_in_brand_id) as brand_name
     FROM external_namings en
     LEFT JOIN users u ON en.created_by = u.id
     LEFT JOIN concepts c ON en.concept_id = c.id
     LEFT JOIN brands b ON en.used_in_brand_id = b.id
     WHERE ${where}
     ORDER BY en.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, perPage, offset)
    .all()

  return c.json({
    success: true,
    data: namings.results,
    total: countResult?.total || 0,
    page,
    per_page: perPage,
  })
})

app.post('/external', requireLibraryAccess('external_namings'), async c => {
  const body = await c.req.json()
  const parsed = createExternalSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  if (parsed.data.concept_id) {
    const concept = await c.env.DB.prepare('SELECT id FROM concepts WHERE id = ?')
      .bind(parsed.data.concept_id)
      .first()
    if (!concept) {
      return c.json({ success: false, error: 'Linked concept not found' }, 400)
    }
  }

  const user = c.get('user')
  const id = generateId('exn')

  await c.env.DB.prepare(
    'INSERT INTO external_namings (id, name, tagline, domain, price, availability_status, concept_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      parsed.data.name,
      parsed.data.tagline || '',
      parsed.data.domain || null,
      parsed.data.price ?? null,
      parsed.data.availability_status || 'unknown',
      parsed.data.concept_id || null,
      user.id
    )
    .run()

  let naming = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first()

  if (parsed.data.domain && isPananamesConfigured(c.env)) {
    const result = await checkDomainAvailability(parsed.data.domain, c.env)
    if (result) {
      await updateNamingDomainStatus(c.env.DB, id, result)
      naming = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
        .bind(id)
        .first()
    }
  }

  return c.json({ success: true, data: naming }, 201)
})

/** Live preview for admin modal: availability + registrar price without persisting. */
app.post('/external/preview-domain', requireLibraryAccess('external_namings'), async c => {
  const body = await c.req.json()
  const parsed = previewDomainSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  if (!isPananamesConfigured(c.env)) {
    return c.json({ success: false, error: 'Domain check service not configured' }, 503)
  }

  const result = await checkDomainAvailability(parsed.data.domain, c.env)
  if (!result) {
    return c.json({
      success: true,
      data: null,
      message: 'Could not check domain (invalid domain or API error).',
    })
  }

  return c.json({
    success: true,
    data: {
      available: result.available,
      price: result.price,
      currency: result.currency,
      checkedAt: result.checkedAt,
    },
  })
})

app.put('/external/:id', requireLibraryAccess('external_namings'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateExternalSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'External naming not found' }, 404)
  }

  if (existing.status === 'used') {
    return c.json({ success: false, error: 'Cannot modify a naming used in a brand' }, 409)
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

  await c.env.DB.prepare(`UPDATE external_namings SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  let updated = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first()

  const domainChanged = parsed.data.domain !== undefined && parsed.data.domain !== existing.domain
  const isAdminOverride = parsed.data.domain_check_source === 'admin_override'

  if (!isAdminOverride && domainChanged && parsed.data.domain && isPananamesConfigured(c.env)) {
    const result = await checkDomainAvailability(parsed.data.domain, c.env)
    if (result) {
      await updateNamingDomainStatus(c.env.DB, id, result)
      updated = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
        .bind(id)
        .first()
    }
  }

  return c.json({ success: true, data: updated })
})

app.delete('/external/:id', requireLibraryAccess('external_namings'), async c => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'External naming not found' }, 404)
  }

  if (existing.used_in_brand_id) {
    return c.json({ success: false, error: 'Cannot delete a naming used in a brand' }, 409)
  }

  await c.env.DB.prepare('DELETE FROM external_namings WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { deleted: true } })
})

// --- Domain Check ---

app.post('/external/:id/check-domain', requireLibraryAccess('external_namings'), async c => {
  const id = c.req.param('id')

  const naming = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first<{
      id: string
      domain: string | null
      domain_checked_at: string | null
      domain_check_source: string | null
    }>()

  if (!naming) {
    return c.json({ success: false, error: 'External naming not found' }, 404)
  }

  if (!naming.domain) {
    return c.json({ success: false, error: 'No domain to check' }, 400)
  }

  if (!isPananamesConfigured(c.env)) {
    return c.json({ success: false, error: 'Domain check service not configured' }, 503)
  }

  if (naming.domain_check_source === 'admin_override') {
    return c.json({
      success: true,
      data: {
        skipped: true,
        reason: 'Admin override is active. Update the naming to remove override first.',
      },
    })
  }

  if (!shouldRecheck(naming.domain_checked_at)) {
    const fresh = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
      .bind(id)
      .first()
    return c.json({ success: true, data: fresh, cached: true })
  }

  const result = await checkDomainAvailability(naming.domain, c.env)
  if (!result) {
    return c.json(
      {
        success: false,
        error:
          'Domain check failed. Check Worker logs for details (Pananames API may have returned an error or signature may be invalid).',
      },
      502
    )
  }

  await updateNamingDomainStatus(c.env.DB, id, result)

  const updated = await c.env.DB.prepare('SELECT * FROM external_namings WHERE id = ?')
    .bind(id)
    .first()

  return c.json({ success: true, data: updated })
})

// --- Internal Namings ---

app.get('/internal', async c => {
  const status = c.req.query('status') || 'active'
  const availableForBrand = c.req.query('available_for_brand')
  const page = parseInt(c.req.query('page') || '1')
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100)
  const offset = (page - 1) * perPage

  let where = '1=1'
  const params: (string | number)[] = []

  if (availableForBrand) {
    where += ' AND ((n.status = ? AND n.used_in_brand_id IS NULL) OR n.used_in_brand_id = ?)'
    params.push('active', availableForBrand)
  } else if (status && status !== 'all') {
    where += ' AND n.status = ?'
    params.push(status)
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM internal_namings n WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>()

  const namings = await c.env.DB.prepare(
    `SELECT n.*, u.name as author_name, COALESCE(b.internal_name, n.used_in_brand_id) as brand_name
     FROM internal_namings n
     LEFT JOIN users u ON n.created_by = u.id
     LEFT JOIN brands b ON n.used_in_brand_id = b.id
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, perPage, offset)
    .all()

  return c.json({
    success: true,
    data: namings.results,
    total: countResult?.total || 0,
    page,
    per_page: perPage,
  })
})

app.post('/internal', requireLibraryAccess('internal_namings'), async c => {
  const body = await c.req.json()
  const parsed = createInternalSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const user = c.get('user')
  const id = generateId('inn')

  await c.env.DB.prepare(
    'INSERT INTO internal_namings (id, name, tagline, created_by) VALUES (?, ?, ?, ?)'
  )
    .bind(id, parsed.data.name, parsed.data.tagline || '', user.id)
    .run()

  const naming = await c.env.DB.prepare('SELECT * FROM internal_namings WHERE id = ?')
    .bind(id)
    .first()
  return c.json({ success: true, data: naming }, 201)
})

app.put('/internal/:id', requireLibraryAccess('internal_namings'), async c => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const parsed = updateInternalSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM internal_namings WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'Internal naming not found' }, 404)
  }

  if (existing.status === 'used') {
    return c.json({ success: false, error: 'Cannot modify a naming used in a brand' }, 409)
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

  await c.env.DB.prepare(`UPDATE internal_namings SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const updated = await c.env.DB.prepare('SELECT * FROM internal_namings WHERE id = ?')
    .bind(id)
    .first()
  return c.json({ success: true, data: updated })
})

app.delete('/internal/:id', requireLibraryAccess('internal_namings'), async c => {
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT * FROM internal_namings WHERE id = ?')
    .bind(id)
    .first()
  if (!existing) {
    return c.json({ success: false, error: 'Internal naming not found' }, 404)
  }

  if (existing.used_in_brand_id) {
    return c.json({ success: false, error: 'Cannot delete a naming used in a brand' }, 409)
  }

  await c.env.DB.prepare('DELETE FROM internal_namings WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { deleted: true } })
})

export default app
