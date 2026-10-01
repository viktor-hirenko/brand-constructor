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
import {
  checkOrderTarget,
  pickedByAnotherBrief,
  reserveIsFrozen,
  reserveListFilter,
  RESERVE_FROZEN_MESSAGE,
  type LibraryKind,
} from '../utils/orders'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

const createExternalSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  domain: z.string().max(255).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  availability_status: z.enum(['available', 'sold', 'unknown']).nullable().optional(),
  domain_check_source: z.enum(['manual', 'pananames', 'admin_override']).nullable().optional(),
  concept_id: z.string().nullable().optional(),
  /** The brief whose order this naming fulfils (Orders page; phase 2a). */
  for_brand_id: z.string().min(1).nullable().optional(),
})

const createInternalSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  for_brand_id: z.string().min(1).nullable().optional(),
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
  for_brand_id: z.string().min(1).nullable().optional(),
})

const updateInternalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  for_brand_id: z.string().min(1).nullable().optional(),
})

/**
 * A PUT that moves a naming to (or off) an order, or relinks a reserved
 * external naming to another concept. Returns the refusal as [message, status].
 */
async function checkReserveChange(
  db: D1Database,
  kind: LibraryKind,
  id: string,
  existing: Record<string, unknown>,
  nextForBrand: string | null | undefined,
  nextConceptId: string | null | undefined
): Promise<[string, 400 | 409] | null> {
  const current = (existing.for_brand_id as string | null) ?? null
  const forBrandChanges = nextForBrand !== undefined && (nextForBrand || null) !== current
  const conceptChanges =
    kind === 'external' &&
    nextConceptId !== undefined &&
    (nextConceptId || null) !== ((existing.concept_id as string | null) ?? null)
  if (!forBrandChanges && !conceptChanges) return null

  if (forBrandChanges && (await reserveIsFrozen(db, current))) return [RESERVE_FROZEN_MESSAGE, 409]

  const target = forBrandChanges ? nextForBrand || null : current
  if (!target) return null
  const conceptId =
    nextConceptId !== undefined ? nextConceptId : ((existing.concept_id as string | null) ?? null)
  const refusal = await checkOrderTarget(db, target, kind, conceptId)
  if (refusal) return [refusal, 400]
  if (forBrandChanges && (await pickedByAnotherBrief(db, kind, id, target))) {
    return ['Цю назву вже обрано в іншому брифі — привʼязати її до замовлення не можна.', 400]
  }
  return null
}

const previewDomainSchema = z.object({
  domain: z.string().min(1).max(255),
})

/** Same row shape as GET /external (joins for author_name, concept_name, brand_name). */
async function getExternalNamingListRow(db: D1Database, id: string) {
  return await db
    .prepare(
      `SELECT en.*, u.name as author_name, c.name as concept_name, COALESCE(b.internal_name, en.used_in_brand_id) as brand_name,
         fb.internal_name as for_brand_name
       FROM external_namings en
       LEFT JOIN users u ON en.created_by = u.id
       LEFT JOIN concepts c ON en.concept_id = c.id
       LEFT JOIN brands b ON en.used_in_brand_id = b.id
       LEFT JOIN brands fb ON en.for_brand_id = fb.id
       WHERE en.id = ?`
    )
    .bind(id)
    .first()
}

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

  const reserve = reserveListFilter('en', availableForBrand, c.req.query('include_reserved'))
  where += reserve.sql
  params.push(...reserve.binds)

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM external_namings en WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>()

  const namings = await c.env.DB.prepare(
    `SELECT en.*, u.name as author_name, c.name as concept_name, COALESCE(b.internal_name, en.used_in_brand_id) as brand_name,
       fb.internal_name as for_brand_name
     FROM external_namings en
     LEFT JOIN users u ON en.created_by = u.id
     LEFT JOIN concepts c ON en.concept_id = c.id
     LEFT JOIN brands b ON en.used_in_brand_id = b.id
     LEFT JOIN brands fb ON en.for_brand_id = fb.id
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

  const forBrandId = parsed.data.for_brand_id || null
  if (forBrandId) {
    const refusal = await checkOrderTarget(c.env.DB, forBrandId, 'external', parsed.data.concept_id)
    if (refusal) return c.json({ success: false, error: refusal }, 400)
  }

  const user = c.get('user')
  const id = generateId('exn')

  await c.env.DB.prepare(
    'INSERT INTO external_namings (id, name, tagline, domain, price, availability_status, concept_id, created_by, for_brand_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      id,
      parsed.data.name,
      parsed.data.tagline || '',
      parsed.data.domain || null,
      parsed.data.price ?? null,
      parsed.data.availability_status || 'unknown',
      parsed.data.concept_id || null,
      user.id,
      forBrandId
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

  const reserveRefusal = await checkReserveChange(
    c.env.DB,
    'external',
    id,
    existing,
    parsed.data.for_brand_id,
    parsed.data.concept_id
  )
  if (reserveRefusal) return c.json({ success: false, error: reserveRefusal[0] }, reserveRefusal[1])

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

  if (await reserveIsFrozen(c.env.DB, existing.for_brand_id as string | null)) {
    return c.json({ success: false, error: RESERVE_FROZEN_MESSAGE }, 409)
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
    const row = await getExternalNamingListRow(c.env.DB, id)
    return c.json({ success: true, data: row, cached: true })
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

  const row = await getExternalNamingListRow(c.env.DB, id)

  return c.json({ success: true, data: row })
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

  const reserve = reserveListFilter('n', availableForBrand, c.req.query('include_reserved'))
  where += reserve.sql
  params.push(...reserve.binds)

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM internal_namings n WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>()

  const namings = await c.env.DB.prepare(
    `SELECT n.*, u.name as author_name, COALESCE(b.internal_name, n.used_in_brand_id) as brand_name,
       fb.internal_name as for_brand_name
     FROM internal_namings n
     LEFT JOIN users u ON n.created_by = u.id
     LEFT JOIN brands b ON n.used_in_brand_id = b.id
     LEFT JOIN brands fb ON n.for_brand_id = fb.id
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

  const forBrandId = parsed.data.for_brand_id || null
  if (forBrandId) {
    const refusal = await checkOrderTarget(c.env.DB, forBrandId, 'internal', null)
    if (refusal) return c.json({ success: false, error: refusal }, 400)
  }

  const user = c.get('user')
  const id = generateId('inn')

  await c.env.DB.prepare(
    'INSERT INTO internal_namings (id, name, tagline, created_by, for_brand_id) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, parsed.data.name, parsed.data.tagline || '', user.id, forBrandId)
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

  const reserveRefusal = await checkReserveChange(
    c.env.DB,
    'internal',
    id,
    existing,
    parsed.data.for_brand_id,
    undefined
  )
  if (reserveRefusal) return c.json({ success: false, error: reserveRefusal[0] }, reserveRefusal[1])

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

  if (await reserveIsFrozen(c.env.DB, existing.for_brand_id as string | null)) {
    return c.json({ success: false, error: RESERVE_FROZEN_MESSAGE }, 409)
  }

  await c.env.DB.prepare('DELETE FROM internal_namings WHERE id = ?').bind(id).run()
  return c.json({ success: true, data: { deleted: true } })
})

export default app
