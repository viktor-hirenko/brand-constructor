import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { createBrandSchema, updateBrandSchema } from '../schemas/brand'
import { generateId } from '../utils/id'
import {
  BRAND_APPROVAL_ROLES,
  BRAND_BRIEF_STATUS,
  isBrandBriefCreatorRole,
} from '@brand-constructor/shared'
import type { BrandStatus } from '@brand-constructor/shared/types'
import {
  applyFieldTransform,
  rowToBrand,
  rowToBrandListItem,
  UPDATABLE_FIELDS,
  type BrandListRow,
  type BrandRow,
} from '../utils/brands'
import {
  insertWorkflowEvent,
  WORKFLOW_EVENT_TYPES,
} from '../utils/brand-workflow'

const crud = new Hono<{ Bindings: Env; Variables: Variables }>()

// FIXME(rbac, 2026-05-23): admin temporarily inherits CEO's read-all access so
// they can manage briefs in the admin panel without gaining approve/send-back
// powers. Revert this single line when brand RBAC is finalised — see PRD v2 §2.
function canListAllBrands(role: string): boolean {
  return (BRAND_APPROVAL_ROLES as readonly string[]).includes(role) || role === 'admin'
}

const BRAND_LIST_FROM = `
  FROM brands b
  LEFT JOIN users u_creator ON u_creator.id = b.created_by
  LEFT JOIN users u_submitted ON u_submitted.id = b.submitted_by
  LEFT JOIN users u_approved ON u_approved.id = b.approved_by
  LEFT JOIN users u_revision ON u_revision.id = b.needs_revision_by
`

const BRAND_LIST_SELECT = `
  SELECT b.*,
    u_creator.name AS author_name,
    u_creator.role AS author_role,
    u_submitted.name AS submitted_by_name,
    u_approved.name AS approved_by_name,
    u_revision.name AS needs_revision_by_name
  ${BRAND_LIST_FROM}
`

crud.get('/', async c => {
  const user = c.get('user')
  const page = parseInt(c.req.query('page') || '1')
  const perPage = parseInt(c.req.query('per_page') || '20')
  const status = c.req.query('status')
  const offset = (page - 1) * perPage

  const canSeeAll = canListAllBrands(user.role)
  const isCreator = isBrandBriefCreatorRole(user.role)

  let query: string
  const params: (string | number)[] = []

  if (canSeeAll) {
    query = `${BRAND_LIST_SELECT} WHERE 1=1`
  } else if (isCreator) {
    query = `${BRAND_LIST_SELECT} WHERE b.created_by = ?`
    params.push(user.id)
  } else {
    query = `${BRAND_LIST_SELECT} WHERE b.status = 'approved'`
  }

  if (status) {
    query += ' AND b.status = ?'
    params.push(status)
  }

  query += ' ORDER BY b.updated_at DESC LIMIT ? OFFSET ?'
  params.push(perPage, offset)

  const result = await c.env.DB.prepare(query)
    .bind(...params)
    .all<BrandListRow>()

  let countQuery: string
  const countParams: (string | number)[] = []

  if (canSeeAll) {
    countQuery = 'SELECT COUNT(*) as count FROM brands WHERE 1=1'
  } else if (isCreator) {
    countQuery = 'SELECT COUNT(*) as count FROM brands WHERE created_by = ?'
    countParams.push(user.id)
  } else {
    countQuery = "SELECT COUNT(*) as count FROM brands WHERE status = 'approved'"
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
    data: result.results.map(rowToBrandListItem),
    total: countResult?.count || 0,
    page,
    perPage,
  })
})

crud.get('/:id', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const canSeeAll = canListAllBrands(user.role)
  const isCreator = isBrandBriefCreatorRole(user.role)

  let row: BrandRow | null

  if (canSeeAll) {
    // cpo_ceo (per PRD v2) + admin (temporary, see canListAllBrands FIXME)
    row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()
  } else if (isCreator) {
    // product_owner sees only their own brands (any status)
    row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ? AND created_by = ?')
      .bind(id, user.id)
      .first<BrandRow>()
  } else {
    // strategy_identity / ui_designer / pr_marketing / product_designer
    // see ONLY approved brands (read-only via Slack links)
    row = await c.env.DB.prepare("SELECT * FROM brands WHERE id = ? AND status = 'approved'")
      .bind(id)
      .first<BrandRow>()
  }

  if (!row) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  return c.json({ success: true, data: rowToBrand(row) })
})

crud.post('/', async c => {
  const user = c.get('user')
  if (!isBrandBriefCreatorRole(user.role)) {
    return c.json(
      { success: false, error: 'Only Product Owner can create a new brand brief' },
      403
    )
  }
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

  try {
    await insertWorkflowEvent(c.env.DB, id, WORKFLOW_EVENT_TYPES.CREATED, user.id, {
      internalName: internalName ?? null,
    })
  } catch (err) {
    console.error('Workflow event insert failed (created):', err)
  }

  return c.json({ success: true, data: rowToBrand(row!) }, 201)
})

crud.put('/:id', async c => {
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

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  if (existing.created_by !== user.id) {
    return c.json(
      { success: false, error: 'Access denied. Wizard edits are only allowed by the brand owner.' },
      403
    )
  }

  const EDITABLE_STATUSES: readonly BrandStatus[] = [
    BRAND_BRIEF_STATUS.DRAFT,
    BRAND_BRIEF_STATUS.NEEDS_REVISION,
  ] as const
  if (!EDITABLE_STATUSES.includes(existing.status as BrandStatus)) {
    return c.json(
      {
        success: false,
        error: `Brand in status "${existing.status}" cannot be edited via wizard. Use the dedicated CEO/PO/status endpoints.`,
      },
      409
    )
  }

  const updates: string[] = []
  const values: (string | number | null)[] = []

  for (const field of UPDATABLE_FIELDS) {
    const value = body[field.key]
    if (value !== undefined) {
      updates.push(`${field.column} = ?`)
      values.push(applyFieldTransform(value, field.transform))
    }
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

crud.delete('/:id', async c => {
  const id = c.req.param('id')
  const user = c.get('user')

  if (user.role !== 'admin') {
    return c.json({ success: false, error: 'Forbidden' }, 403)
  }

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE concepts SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE external_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE internal_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id),
  ])

  return c.json({ success: true, data: null })
})

export default crud
