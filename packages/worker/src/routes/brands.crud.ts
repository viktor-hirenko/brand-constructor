import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { createBrandSchema, updateBrandSchema } from '../schemas/brand'
import { generateId } from '../utils/id'
import { nextNewBrandName } from '../utils/brand-number'
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
  type UpdateBrandBody,
} from '../utils/brands'
import {
  insertWorkflowEvent,
  WORKFLOW_EVENT_TYPES,
} from '../utils/brand-workflow'
import {
  BRIEF_CHANGED_MESSAGE,
  checkInWorkEdit,
  selectionFromRow,
  type BriefSelection,
} from '../utils/brief-checks'
import {
  cancelledOrderKinds,
  checkSelectable,
  droppedOrderKinds,
  newlyPicked,
  openOrderKinds,
  pickedFromSelection,
  releaseAllStatements,
  releaseCancelledStatements,
} from '../utils/orders'
import { dispatchSlack } from '../utils/slack-dispatch'
import {
  BRIEF_DELETED_REASON,
  buildOrderCancelledMessage,
  cancelReason,
  orderCancelledInput,
  sendOrderCancelledForDeletedBrief,
  type CancelledOrder,
} from '../utils/slack-orders'

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
  if (!internalName) internalName = await nextNewBrandName(c.env.DB)

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

  // `in_work`: the author swaps an order for what the teams made (H-01) —
  // `checkInWorkEdit` keeps the order itself and light/dark untouchable.
  const EDITABLE_STATUSES: readonly BrandStatus[] = [
    BRAND_BRIEF_STATUS.DRAFT,
    BRAND_BRIEF_STATUS.IN_WORK,
    BRAND_BRIEF_STATUS.NEEDS_REVISION,
  ] as const
  // A tab opened before the brief was sent (or approved) is the usual way here:
  // the author sees the plain «reload», not a status code (H-23).
  if (!EDITABLE_STATUSES.includes(existing.status as BrandStatus)) {
    return c.json({ success: false, error: BRIEF_CHANGED_MESSAGE }, 409)
  }

  if (existing.status === BRAND_BRIEF_STATUS.IN_WORK) {
    const refusal = checkInWorkEdit(existing, body)
    if (refusal) return c.json({ success: false, error: refusal }, 400)
  }

  // What another brief's order made, or another brand already uses, is not
  // this brief's to pick (phase 2a reserve; H-09). Only what is picked NOW is
  // checked: the wizard resends the whole brief on every save.
  const nextSelection = selectionAfterPut(existing, body)
  const takenRefusal = await checkSelectable(
    c.env.DB,
    id,
    newlyPicked(pickedFromSelection(selectionFromRow(existing)), pickedFromSelection(nextSelection))
  )
  if (takenRefusal) return c.json({ success: false, error: takenRefusal }, 400)

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
  values.push(id, existing.status)

  // Only if the status is still the one checked above: a save racing a status
  // change (second tab, double click) must not write into a sent brief.
  const result = await c.env.DB.prepare(
    `UPDATE brands SET ${updates.join(', ')} WHERE id = ? AND status = ?`
  )
    .bind(...values)
    .run()
  if (result.meta.changes !== 1) {
    return c.json({ success: false, error: BRIEF_CHANGED_MESSAGE }, 409)
  }

  if (existing.status === BRAND_BRIEF_STATUS.IN_WORK) {
    let cancelled: CancelledOrder[] = []
    try {
      cancelled = await recordCancelledOrders(c.env.DB, id, user.id, existing, body, nextSelection)
    } catch (err) {
      console.error('Order cancellation bookkeeping failed:', err)
    }
    // N2: the team hears it under the order message, once — the order is off the brief now.
    if (cancelled.length > 0 && c.env.SLACK_BOT_TOKEN) {
      const message = buildOrderCancelledMessage(
        orderCancelledInput(existing, cancelReason(cancelled), c.env.SLACK_CHANNEL_STRATEGY)
      )
      c.executionCtx.waitUntil(
        dispatchSlack(c.env.DB, c.env.SLACK_BOT_TOKEN, id, user.id, [{ kind: 'strategy', message }])
      )
    }
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) })
})

/** The brief's picks after this save: the body where it says, the stored row elsewhere. */
function selectionAfterPut(existing: BrandRow, body: UpdateBrandBody): BriefSelection {
  const own = selectionFromRow(existing)
  return {
    conceptId: body.conceptId !== undefined ? body.conceptId || null : own.conceptId,
    externalIds:
      body.externalNamingIds !== undefined
        ? (body.externalNamingIds ?? []).filter((v): v is string => typeof v === 'string' && v !== '')
        : own.externalIds,
    internalId: body.internalNamingId !== undefined ? body.internalNamingId || null : own.internalId,
  }
}

/**
 * The author replaced an order with something the team did not make: the order
 * is cancelled — an `order_cancelled` event per kind and the made items go back
 * to the library. Returns what was cancelled, for the Slack reply.
 */
async function recordCancelledOrders(
  db: D1Database,
  brandId: string,
  userId: string,
  existing: BrandRow,
  body: UpdateBrandBody,
  sel: BriefSelection
): Promise<CancelledOrder[]> {
  const cancelled = await cancelledOrderKinds(db, brandId, droppedOrderKinds(existing, body), sel)
  if (cancelled.length === 0) return []
  const out: CancelledOrder[] = []
  for (const kind of cancelled) {
    const picked = await pickedNames(db, kind, sel)
    await insertWorkflowEvent(db, brandId, WORKFLOW_EVENT_TYPES.ORDER_CANCELLED, userId, {
      kind,
      picked,
    })
    out.push({ kind, picked })
  }
  await db.batch(cancelled.flatMap(kind => releaseCancelledStatements(db, brandId, kind, sel)))
  // A naming order goes with the concept it was for (H-07): say which concept came instead.
  if (sel.conceptId && sel.conceptId !== existing.concept_id) {
    const [conceptName] = await pickedNames(db, 'concept', sel)
    for (const order of out) order.conceptChangedTo = conceptName ?? null
  }
  return out
}

async function pickedNames(db: D1Database, kind: string, sel: BriefSelection): Promise<string[]> {
  const [table, ids] =
    kind === 'concept'
      ? ['concepts', sel.conceptId ? [sel.conceptId] : []]
      : kind === 'externalNaming'
        ? ['external_namings', sel.externalIds]
        : ['internal_namings', sel.internalId ? [sel.internalId] : []]
  if (ids.length === 0) return []
  const rows = await db
    .prepare(`SELECT name FROM ${table} WHERE id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all<{ name: string }>()
  return rows.results.map(r => r.name)
}

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

  // A brief deleted while the teams still work on its order: they hear it is off.
  const orderOff =
    existing.status === BRAND_BRIEF_STATUS.IN_WORK && openOrderKinds(existing).length > 0

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM brand_workflow_events WHERE brand_id = ?').bind(id),
    c.env.DB.prepare(
      "UPDATE concepts SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE external_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE internal_namings SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE pr_packages SET used_in_brand_id = NULL, updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    c.env.DB.prepare(
      "UPDATE component_variants SET used_in_brand_id = NULL, status = 'active', updated_at = datetime('now') WHERE used_in_brand_id = ?"
    ).bind(id),
    // What the teams made for this brief's order goes back to the library.
    ...releaseAllStatements(c.env.DB, id),
    c.env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id),
  ])

  if (orderOff && c.env.SLACK_BOT_TOKEN) {
    c.executionCtx.waitUntil(
      sendOrderCancelledForDeletedBrief(
        c.env.SLACK_BOT_TOKEN,
        orderCancelledInput(existing, BRIEF_DELETED_REASON, c.env.SLACK_CHANNEL_STRATEGY)
      )
    )
  }

  return c.json({ success: true, data: null })
})

export default crud
