import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { generateId } from '../utils/id'
import { BRAND_APPROVAL_ROLES } from '@brand-constructor/shared'
import type { Brand, BrandStatus } from '@brand-constructor/shared/types'

const VALID_STATUSES: BrandStatus[] = [
  'draft',
  'submitted',
  'needs_revision',
  'approved',
  'rejected',
]

const STATUS_TRANSITIONS: Record<BrandStatus, BrandStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'needs_revision', 'rejected'],
  needs_revision: ['submitted'],
  approved: [],
  rejected: [],
}

const createBrandSchema = z.object({
  internalName: z.string().max(300).nullish(),
  geo: z.string().max(500).optional(),
  launchDate: z.string().max(30).optional(),
  mode: z.enum(['light', 'dark']).nullish(),
  conceptId: z.string().max(100).nullish(),
  conceptComment: z.string().max(5000).optional(),
  externalNamingIds: z.array(z.string().max(100)).max(3).optional(),
  externalNamingComment: z.string().max(5000).optional(),
  internalNamingId: z.string().max(100).nullish(),
  internalNamingComment: z.string().max(5000).optional(),
  prPackageId: z.string().max(100).nullish(),
  prPackageComment: z.string().max(5000).optional(),
  legalLanding: z.boolean().optional(),
  partnerLanding: z.boolean().optional(),
  deliverablesComment: z.string().max(5000).optional(),
  componentSelections: z.record(z.string()).optional(),
  componentsComment: z.string().max(5000).optional(),
  delegateToDesigners: z.boolean().optional(),
  newConceptBrief: z.any().nullish(),
  developmentDeadline: z.string().max(30).optional(),
  newNamingBrief: z.any().nullish(),
  stepData: z.any().optional(),
  currentStep: z.number().int().min(1).max(10).optional(),
})

const updateBrandSchema = z.object({
  internalName: z.string().max(300).nullish(),
  geo: z.string().max(500).optional(),
  launchDate: z.string().max(30).optional(),
  mode: z.enum(['light', 'dark']).nullish(),
  conceptId: z.string().max(100).nullish(),
  conceptComment: z.string().max(5000).optional(),
  externalNamingIds: z.array(z.string().max(100)).max(3).optional(),
  externalNamingComment: z.string().max(5000).optional(),
  internalNamingId: z.string().max(100).nullish(),
  internalNamingComment: z.string().max(5000).optional(),
  prPackageId: z.string().max(100).nullish(),
  prPackageComment: z.string().max(5000).optional(),
  legalLanding: z.boolean().optional(),
  partnerLanding: z.boolean().optional(),
  deliverablesComment: z.string().max(5000).optional(),
  componentSelections: z.record(z.string()).optional(),
  componentsComment: z.string().max(5000).optional(),
  delegateToDesigners: z.boolean().optional(),
  newConceptBrief: z.any().nullish(),
  developmentDeadline: z.string().max(30).optional(),
  newNamingBrief: z.any().nullish(),
  stepData: z.any().optional(),
  currentStep: z.number().int().min(1).max(10).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'submitted', 'needs_revision', 'approved', 'rejected']),
  ceoComments: z.record(z.string()).optional(),
  ceoSelections: z.record(z.string()).optional(),
})

interface BrandRow {
  id: string
  internal_name: string | null
  status: string
  created_by: string
  geo: string | null
  launch_date: string | null
  mode: string | null
  concept_id: string | null
  concept_comment: string | null
  external_naming_ids: string | null
  external_naming_comment: string | null
  internal_naming_id: string | null
  internal_naming_comment: string | null
  pr_package_id: string | null
  pr_package_comment: string | null
  legal_landing: number
  partner_landing: number
  deliverables_comment: string | null
  component_selections: string | null
  components_comment: string | null
  delegate_to_designers: number
  new_concept_brief: string | null
  ceo_comments: string | null
  ceo_selections: string | null
  development_deadline: string | null
  new_naming_brief: string | null
  step_data: string | null
  current_step: number
  created_at: string
  updated_at: string
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    internalName: row.internal_name,
    status: row.status as BrandStatus,
    createdBy: row.created_by,
    geo: row.geo,
    launchDate: row.launch_date,
    mode: row.mode as 'light' | 'dark' | null,
    conceptId: row.concept_id,
    conceptComment: row.concept_comment,
    externalNamingIds: row.external_naming_ids ? JSON.parse(row.external_naming_ids) : [],
    externalNamingComment: row.external_naming_comment,
    internalNamingId: row.internal_naming_id,
    internalNamingComment: row.internal_naming_comment,
    prPackageId: row.pr_package_id,
    prPackageComment: row.pr_package_comment,
    legalLanding: Boolean(row.legal_landing),
    partnerLanding: Boolean(row.partner_landing),
    deliverablesComment: row.deliverables_comment,
    componentSelections: row.component_selections ? JSON.parse(row.component_selections) : {},
    componentsComment: row.components_comment,
    delegateToDesigners: Boolean(row.delegate_to_designers),
    newConceptBrief: row.new_concept_brief ? JSON.parse(row.new_concept_brief) : null,
    ceoComments: row.ceo_comments ? JSON.parse(row.ceo_comments) : null,
    ceoSelections: row.ceo_selections ? JSON.parse(row.ceo_selections) : null,
    developmentDeadline: row.development_deadline,
    newNamingBrief: row.new_naming_brief ? JSON.parse(row.new_naming_brief) : null,
    stepData: row.step_data ? JSON.parse(row.step_data) : null,
    currentStep: row.current_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const brands = new Hono<{ Bindings: Env; Variables: Variables }>()

brands.get('/', async c => {
  const user = c.get('user')
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '20')
  const status = c.req.query('status')
  const offset = (page - 1) * perPage

  const canSeeAll = (BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)

  let query: string
  const params: (string | number)[] = []

  if (canSeeAll) {
    query = 'SELECT * FROM brands WHERE 1=1'
  } else {
    query = 'SELECT * FROM brands WHERE created_by = ?'
    params.push(user.id)
  }

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
  params.push(perPage, offset)

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all<BrandRow>()

  let countQuery: string
  const countParams: (string | number)[] = []

  if (canSeeAll) {
    countQuery = 'SELECT COUNT(*) as count FROM brands WHERE 1=1'
  } else {
    countQuery = 'SELECT COUNT(*) as count FROM brands WHERE created_by = ?'
    countParams.push(user.id)
  }

  if (status) {
    countQuery += ' AND status = ?'
    countParams.push(status)
  }

  const countResult = await c.env.DB.prepare(countQuery)
    .bind(...countParams)
    .first<{ count: number }>()

  return c.json({
    success: true,
    data: result.results.map(rowToBrand),
    total: countResult?.count || 0,
    page,
    perPage,
  })
})

brands.get('/:id', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const canSeeAll = (BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)

  let row: BrandRow | null

  if (canSeeAll) {
    row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()
  } else {
    row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ? AND created_by = ?')
      .bind(id, user.id)
      .first<BrandRow>()
  }

  if (!row) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  return c.json({ success: true, data: rowToBrand(row) })
})

brands.post('/', async c => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = createBrandSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const id = generateId('brand')
  const now = new Date().toISOString()

  let internalName = parsed.data.internalName || null
  if (!internalName) {
    const countResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM brands').first<{
      count: number
    }>()
    const brandNumber = (countResult?.count ?? 0) + 1
    internalName = `New Brand #${brandNumber}`
  }

  const d = parsed.data

  await c.env.DB.prepare(
    `
    INSERT INTO brands (
      id, internal_name, status, created_by, current_step,
      geo, launch_date, mode, concept_id, concept_comment,
      external_naming_ids, external_naming_comment,
      internal_naming_id, internal_naming_comment,
      pr_package_id, pr_package_comment,
      legal_landing, partner_landing, deliverables_comment,
      component_selections, components_comment, delegate_to_designers,
      new_concept_brief, development_deadline, new_naming_brief,
      step_data, created_at, updated_at
    ) VALUES (?, ?, 'draft', ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?)
  `
  )
    .bind(
      id,
      internalName,
      user.id,
      d.currentStep ?? 1,
      d.geo ?? null,
      d.launchDate ?? null,
      d.mode ?? null,
      d.conceptId ?? null,
      d.conceptComment ?? null,
      d.externalNamingIds ? JSON.stringify(d.externalNamingIds) : null,
      d.externalNamingComment ?? null,
      d.internalNamingId ?? null,
      d.internalNamingComment ?? null,
      d.prPackageId ?? null,
      d.prPackageComment ?? null,
      d.legalLanding ? 1 : 0,
      d.partnerLanding ? 1 : 0,
      d.deliverablesComment ?? null,
      d.componentSelections ? JSON.stringify(d.componentSelections) : null,
      d.componentsComment ?? null,
      d.delegateToDesigners ? 1 : 0,
      d.newConceptBrief ? JSON.stringify(d.newConceptBrief) : null,
      d.developmentDeadline ?? null,
      d.newNamingBrief ? JSON.stringify(d.newNamingBrief) : null,
      d.stepData ? JSON.stringify(d.stepData) : null,
      now,
      now
    )
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) }, 201)
})

brands.put('/:id', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const rawBody = await c.req.json()
  const parsed = updateBrandSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const body = parsed.data

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ? AND created_by = ?')
    .bind(id, user.id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  const updates: string[] = []
  const values: (string | number | null)[] = []

  if (body.internalName !== undefined) {
    updates.push('internal_name = ?')
    values.push(body.internalName ?? null)
  }
  if (body.geo !== undefined) {
    updates.push('geo = ?')
    values.push(body.geo)
  }
  if (body.launchDate !== undefined) {
    updates.push('launch_date = ?')
    values.push(body.launchDate)
  }
  if (body.mode !== undefined) {
    updates.push('mode = ?')
    values.push(body.mode ?? null)
  }
  if (body.conceptId !== undefined) {
    updates.push('concept_id = ?')
    values.push(body.conceptId ?? null)
  }
  if (body.conceptComment !== undefined) {
    updates.push('concept_comment = ?')
    values.push(body.conceptComment)
  }
  if (body.externalNamingIds !== undefined) {
    updates.push('external_naming_ids = ?')
    values.push(JSON.stringify(body.externalNamingIds))
  }
  if (body.externalNamingComment !== undefined) {
    updates.push('external_naming_comment = ?')
    values.push(body.externalNamingComment)
  }
  if (body.internalNamingId !== undefined) {
    updates.push('internal_naming_id = ?')
    values.push(body.internalNamingId ?? null)
  }
  if (body.internalNamingComment !== undefined) {
    updates.push('internal_naming_comment = ?')
    values.push(body.internalNamingComment)
  }
  if (body.prPackageId !== undefined) {
    updates.push('pr_package_id = ?')
    values.push(body.prPackageId ?? null)
  }
  if (body.prPackageComment !== undefined) {
    updates.push('pr_package_comment = ?')
    values.push(body.prPackageComment)
  }
  if (body.legalLanding !== undefined) {
    updates.push('legal_landing = ?')
    values.push(body.legalLanding ? 1 : 0)
  }
  if (body.partnerLanding !== undefined) {
    updates.push('partner_landing = ?')
    values.push(body.partnerLanding ? 1 : 0)
  }
  if (body.deliverablesComment !== undefined) {
    updates.push('deliverables_comment = ?')
    values.push(body.deliverablesComment)
  }
  if (body.componentSelections !== undefined) {
    updates.push('component_selections = ?')
    values.push(JSON.stringify(body.componentSelections))
  }
  if (body.componentsComment !== undefined) {
    updates.push('components_comment = ?')
    values.push(body.componentsComment)
  }
  if (body.delegateToDesigners !== undefined) {
    updates.push('delegate_to_designers = ?')
    values.push(body.delegateToDesigners ? 1 : 0)
  }
  if (body.newConceptBrief !== undefined) {
    updates.push('new_concept_brief = ?')
    values.push(body.newConceptBrief != null ? JSON.stringify(body.newConceptBrief) : null)
  }
  if (body.developmentDeadline !== undefined) {
    updates.push('development_deadline = ?')
    values.push(body.developmentDeadline)
  }
  if (body.newNamingBrief !== undefined) {
    updates.push('new_naming_brief = ?')
    values.push(body.newNamingBrief != null ? JSON.stringify(body.newNamingBrief) : null)
  }
  if (body.stepData !== undefined) {
    updates.push('step_data = ?')
    values.push(JSON.stringify(body.stepData))
  }
  if (body.currentStep !== undefined) {
    updates.push('current_step = ?')
    values.push(body.currentStep)
  }

  if (updates.length === 0) {
    return c.json({ success: true, data: rowToBrand(existing) })
  }

  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) })
})

brands.patch('/:id/status', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const rawBody = await c.req.json()
  const parsed = updateStatusSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const body = parsed.data
  const targetStatus = body.status as BrandStatus

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  const currentStatus = existing.status as BrandStatus
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] ?? []

  if (!allowedTransitions.includes(targetStatus)) {
    return c.json(
      {
        success: false,
        error: `Invalid status transition: ${currentStatus} → ${targetStatus}`,
      },
      400
    )
  }

  if (targetStatus === 'submitted') {
    if (existing.created_by !== user.id) {
      return c.json({ success: false, error: 'Only the brand owner can submit for review' }, 403)
    }
  }

  if (['approved', 'needs_revision', 'rejected'].includes(targetStatus)) {
    if (!(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden: only CPO/CEO, Admin, or Head DHC can approve/reject brands',
        },
        403
      )
    }
  }

  const updates: string[] = ['status = ?', 'updated_at = ?']
  const values: (string | number | null)[] = [targetStatus, new Date().toISOString()]

  if (body.ceoComments !== undefined) {
    updates.push('ceo_comments = ?')
    values.push(JSON.stringify(body.ceoComments))
  }
  if (body.ceoSelections !== undefined) {
    updates.push('ceo_selections = ?')
    values.push(JSON.stringify(body.ceoSelections))
  }

  values.push(id)

  await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  if (targetStatus === 'approved') {
    const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
      .bind(id)
      .first<BrandRow>()

    const ceoSel: Record<string, string> = (() => {
      try {
        return JSON.parse(brand?.ceo_selections || '{}')
      } catch {
        return {}
      }
    })()

    const finalConceptId = ceoSel.concept || brand?.concept_id || null
    const finalExtIds: string[] = (() => {
      if (ceoSel.externalNaming) return [ceoSel.externalNaming]
      try {
        return JSON.parse(brand?.external_naming_ids || '[]')
      } catch {
        return []
      }
    })()
    const finalIntId = ceoSel.internalNaming || brand?.internal_naming_id || null

    const componentSelections: Record<string, string> = (() => {
      try {
        return JSON.parse(brand?.component_selections || '{}')
      } catch {
        return {}
      }
    })()

    const batchStatements: ReturnType<typeof c.env.DB.prepare>[] = []

    if (finalConceptId !== brand?.concept_id || ceoSel.externalNaming || ceoSel.internalNaming) {
      const brandUpdates: string[] = ["updated_at = datetime('now')"]
      const brandValues: (string | null)[] = []
      if (ceoSel.concept) {
        brandUpdates.push('concept_id = ?')
        brandValues.push(finalConceptId)
      }
      if (ceoSel.externalNaming) {
        brandUpdates.push('external_naming_ids = ?')
        brandValues.push(JSON.stringify(finalExtIds))
      }
      if (ceoSel.internalNaming) {
        brandUpdates.push('internal_naming_id = ?')
        brandValues.push(finalIntId)
      }
      if (brandValues.length > 0) {
        brandValues.push(id)
        batchStatements.push(
          c.env.DB.prepare(`UPDATE brands SET ${brandUpdates.join(', ')} WHERE id = ?`).bind(
            ...brandValues
          )
        )
      }
    }

    if (finalConceptId) {
      batchStatements.push(
        c.env.DB.prepare(
          "UPDATE concepts SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ?"
        ).bind(id, finalConceptId)
      )
    }

    for (const extId of finalExtIds) {
      if (extId) {
        batchStatements.push(
          c.env.DB.prepare(
            "UPDATE external_namings SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ?"
          ).bind(id, extId)
        )
      }
    }

    if (finalIntId) {
      batchStatements.push(
        c.env.DB.prepare(
          "UPDATE internal_namings SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ?"
        ).bind(id, finalIntId)
      )
    }

    for (const variantId of Object.values(componentSelections)) {
      if (variantId) {
        batchStatements.push(
          c.env.DB.prepare(
            "UPDATE component_variants SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ?"
          ).bind(id, variantId)
        )
      }
    }

    if (brand?.pr_package_id) {
      batchStatements.push(
        c.env.DB.prepare(
          "UPDATE pr_packages SET used_in_brand_id = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(id, brand.pr_package_id)
      )
    }

    if (batchStatements.length > 0) {
      await c.env.DB.batch(batchStatements)
    }
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) })
})

brands.delete('/:id', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const isAdmin = user.role === 'admin' || user.role === 'head_dhc'

  let existing: BrandRow | null

  if (isAdmin) {
    existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
      .bind(id)
      .first<BrandRow>()
  } else {
    existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ? AND created_by = ?')
      .bind(id, user.id)
      .first<BrandRow>()
  }

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  await c.env.DB.prepare(
    "UPDATE concepts SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
  )
    .bind(id)
    .run()
  await c.env.DB.prepare(
    "UPDATE external_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
  )
    .bind(id)
    .run()
  await c.env.DB.prepare(
    "UPDATE internal_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
  )
    .bind(id)
    .run()
  await c.env.DB.prepare(
    "UPDATE component_variants SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
  )
    .bind(id)
    .run()

  await c.env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id).run()

  return c.json({ success: true, data: null })
})

export default brands
