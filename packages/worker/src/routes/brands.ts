import { Hono } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'
import { createBrandSchema, updateBrandSchema } from '../schemas/brand'
import { generateId } from '../utils/id'
import {
  sendSlackMessage,
  buildStrategyMessage,
  buildPrMarketingMessage,
  buildProductDesignMessage,
  buildSubmittedMessage,
  buildResubmittedMessage,
  buildNeedsRevisionMessage,
  buildApprovedWorkflowMessage,
  buildNewBriefsApprovalMessage,
  buildNewBriefsStrategyMessage,
  buildNewBriefsPrMessage,
  buildNewBriefsDesignMessage,
  type BrandNotificationData,
} from '../utils/slack'
import { BRAND_APPROVAL_ROLES, isBrandBriefCreatorRole } from '@brand-constructor/shared'
import type {
  Brand,
  BrandCeoComments,
  BrandStatus,
  CeoCommentMeta,
} from '@brand-constructor/shared/types'

const VALID_STATUSES: BrandStatus[] = [
  'draft',
  'submitted',
  'needs_revision',
  'approved',
]

const STATUS_TRANSITIONS: Record<BrandStatus, BrandStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'needs_revision'],
  needs_revision: ['submitted', 'approved'],
  approved: [],
}

const ceoSelectionValueSchema = z.union([z.string(), z.array(z.string())])

/**
 * Wire format for a CEO comment: either the legacy raw string (kept for
 * backward-compat with older clients) or the modern meta object. The handler
 * normalises both shapes to `CeoCommentMeta` before persisting.
 */
const ceoCommentMetaSchema = z.object({
  value: z.string().max(5000),
  resolved: z.boolean(),
  resolvedAt: z.string().nullable(),
})

const ceoCommentValueSchema = z.union([z.string().max(5000), ceoCommentMetaSchema])

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'submitted', 'needs_revision', 'approved']),
  ceoComments: z.record(ceoCommentValueSchema).optional(),
  ceoSelections: z.record(ceoSelectionValueSchema).optional(),
})

const patchCeoSelectionsSchema = z.object({
  ceoSelections: z.record(ceoSelectionValueSchema),
})

/** Body schema for `PATCH /:id/ceo-comments/resolve`. */
const patchCeoCommentResolveSchema = z.object({
  section: z.string().min(1).max(100),
  resolved: z.boolean(),
})

/** Section keys that may carry a `resolved` flag (everything except `general`). */
const RESOLVABLE_SECTION_KEYS = new Set([
  'basics',
  'concept',
  'externalNaming',
  'internalNaming',
  'marketingPackage',
  'deliverables',
  'visualComponents',
])

type UpdateBrandBody = z.infer<typeof updateBrandSchema>
type FieldTransform = 'direct' | 'nullish' | 'bool' | 'json' | 'json_nullable'

interface UpdatableField {
  key: keyof UpdateBrandBody
  column: string
  transform: FieldTransform
}

const UPDATABLE_FIELDS: UpdatableField[] = [
  { key: 'internalName',         column: 'internal_name',          transform: 'nullish'       },
  { key: 'geo',                  column: 'geo',                    transform: 'direct'        },
  { key: 'launchDate',           column: 'launch_date',            transform: 'direct'        },
  { key: 'mode',                 column: 'mode',                   transform: 'nullish'       },
  { key: 'conceptId',            column: 'concept_id',             transform: 'nullish'       },
  { key: 'conceptComment',       column: 'concept_comment',        transform: 'direct'        },
  { key: 'externalNamingIds',    column: 'external_naming_ids',    transform: 'json'          },
  { key: 'externalNamingComment',column: 'external_naming_comment',transform: 'direct'        },
  { key: 'internalNamingId',     column: 'internal_naming_id',     transform: 'nullish'       },
  { key: 'internalNamingComment',column: 'internal_naming_comment',transform: 'direct'        },
  { key: 'prPackageId',          column: 'pr_package_id',          transform: 'nullish'       },
  { key: 'prPackageComment',     column: 'pr_package_comment',     transform: 'direct'        },
  { key: 'legalLanding',         column: 'legal_landing',          transform: 'bool'          },
  { key: 'partnerLanding',       column: 'partner_landing',        transform: 'bool'          },
  { key: 'deliverablesComment',  column: 'deliverables_comment',   transform: 'direct'        },
  { key: 'componentSelections',  column: 'component_selections',   transform: 'json'          },
  { key: 'componentsComment',    column: 'components_comment',     transform: 'direct'        },
  { key: 'delegateToDesigners',  column: 'delegate_to_designers',  transform: 'bool'          },
  { key: 'newConceptBrief',      column: 'new_concept_brief',      transform: 'json_nullable' },
  { key: 'developmentDeadline',  column: 'development_deadline',   transform: 'direct'        },
  { key: 'newNamingBrief',       column: 'new_naming_brief',       transform: 'json_nullable' },
  { key: 'stepData',             column: 'step_data',              transform: 'json'          },
  { key: 'currentStep',          column: 'current_step',           transform: 'direct'        },
]

function applyFieldTransform(value: unknown, transform: FieldTransform): string | number | null {
  switch (transform) {
    case 'direct':       return value as string | number
    case 'nullish':      return (value as string | null | undefined) ?? null
    case 'bool':         return (value as boolean) ? 1 : 0
    case 'json':         return JSON.stringify(value)
    case 'json_nullable':return value != null ? JSON.stringify(value) : null
  }
}

/**
 * Normalises wire-format CEO comments (legacy string OR meta object) into the
 * persisted shape `CeoCommentMeta`. Legacy strings become `resolved: false`
 * with `resolvedAt: null`.
 */
function normaliseCeoCommentsForStorage(
  raw: Record<string, string | CeoCommentMeta>
): BrandCeoComments {
  const out: BrandCeoComments = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      out[key] = { value, resolved: false, resolvedAt: null }
    } else {
      out[key] = {
        value: value.value,
        resolved: value.resolved,
        resolvedAt: value.resolvedAt,
      }
    }
  }
  return out
}

/**
 * Reads `ceo_comments` JSON from the DB row and upgrades any legacy plain
 * strings to `CeoCommentMeta`. Always returns the modern shape, so callers
 * never need to handle the union themselves.
 */
function parseCeoCommentsFromRow(raw: string | null): BrandCeoComments | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const result: BrandCeoComments = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = { value, resolved: false, resolvedAt: null }
    } else if (value && typeof value === 'object') {
      const meta = value as Partial<CeoCommentMeta>
      result[key] = {
        value: typeof meta.value === 'string' ? meta.value : '',
        resolved: Boolean(meta.resolved),
        resolvedAt: typeof meta.resolvedAt === 'string' ? meta.resolvedAt : null,
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null
}

/**
 * Flattens `BrandCeoComments` to `Record<string, string>` for downstream
 * consumers (Slack notifications, audit log) that don't care about resolved
 * state.
 */
function flattenCeoCommentsToValues(comments: BrandCeoComments | null): Record<string, string> {
  if (!comments) return {}
  const out: Record<string, string> = {}
  for (const [key, meta] of Object.entries(comments)) {
    if (meta.value.trim()) {
      out[key] = meta.value
    }
  }
  return out
}

/**
 * CEO selection values can be either a single id (string) or a list of ids
 * (string[] — e.g. `externalNaming` after the CEO reselect flow). These helpers
 * normalize the union so downstream D1 `.bind()` calls never receive an array.
 */
function firstId(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value || null
}

function asIdArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

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
    ceoComments: parseCeoCommentsFromRow(row.ceo_comments),
    ceoSelections: row.ceo_selections ? JSON.parse(row.ceo_selections) : null,
    developmentDeadline: row.development_deadline,
    newNamingBrief: row.new_naming_brief ? JSON.parse(row.new_naming_brief) : null,
    stepData: row.step_data ? JSON.parse(row.step_data) : null,
    currentStep: row.current_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function collectBrandNotificationData(
  db: D1Database,
  brand: BrandRow,
  constructorUrl: string,
  ceoSelectionsOverride?: Record<string, string | string[]>
): Promise<BrandNotificationData> {
  const ceoSel: Record<string, string | string[]> =
    ceoSelectionsOverride ??
    (() => {
      try {
        return JSON.parse(brand.ceo_selections || '{}')
      } catch {
        return {}
      }
    })()

  const finalConceptId = firstId(ceoSel.concept) || brand.concept_id || null
  const finalExtIds: string[] = (() => {
    const overrideIds = asIdArray(ceoSel.externalNaming)
    if (overrideIds.length > 0) return overrideIds
    try {
      return JSON.parse(brand.external_naming_ids || '[]')
    } catch {
      return []
    }
  })()
  const finalIntId = firstId(ceoSel.internalNaming) || brand.internal_naming_id || null

  const [conceptRow, intNamingRow, prPackageRow] = await Promise.all([
    finalConceptId
      ? db
          .prepare('SELECT name FROM concepts WHERE id = ?')
          .bind(finalConceptId)
          .first<{ name: string }>()
      : null,
    finalIntId
      ? db
          .prepare('SELECT name FROM internal_namings WHERE id = ?')
          .bind(finalIntId)
          .first<{ name: string }>()
      : null,
    brand.pr_package_id
      ? db
          .prepare(
            'SELECT name, timeline, teams_involved, components_list, requirements FROM pr_packages WHERE id = ?'
          )
          .bind(brand.pr_package_id)
          .first<{
            name: string
            timeline: string
            teams_involved: string
            components_list: string
            requirements: string
          }>()
      : null,
  ])

  let extNamingNames: string[] = []
  if (finalExtIds.length > 0) {
    const placeholders = finalExtIds.map(() => '?').join(',')
    const extRows = await db
      .prepare(`SELECT name FROM external_namings WHERE id IN (${placeholders})`)
      .bind(...finalExtIds)
      .all<{ name: string }>()
    extNamingNames = extRows.results.map(r => r.name)
  }

  let brandBasicsComment: string | null = null

  try {
    const stepData = brand.step_data ? JSON.parse(brand.step_data) : null
    if (stepData?.brandBasics?.comment) {
      brandBasicsComment = stepData.brandBasics.comment
    }
  } catch {
    /* step_data parse failure is non-critical */
  }

  // Slack notifications consume the flat `Record<string, string>` shape — drop
  // resolved/resolvedAt metadata before forwarding.
  const ceoCommentsForSlack = flattenCeoCommentsToValues(parseCeoCommentsFromRow(brand.ceo_comments))
  const ceoComments: Record<string, string> | null =
    Object.keys(ceoCommentsForSlack).length > 0 ? ceoCommentsForSlack : null

  let rawSelections: Record<string, string> = {}
  try {
    rawSelections = brand.component_selections ? JSON.parse(brand.component_selections) : {}
  } catch {
    rawSelections = {}
  }

  const resolvedComponents: Array<{ typeName: string; variantName: string }> = []
  const selectionEntries = Object.entries(rawSelections)
  if (selectionEntries.length > 0) {
    const typeIds = selectionEntries.map(([typeId]) => typeId)
    const variantIds = selectionEntries.map(([, variantId]) => variantId)

    const [typeRows, variantRows] = await Promise.all([
      db
        .prepare(
          `SELECT id, name, sort_order FROM component_types WHERE id IN (${typeIds.map(() => '?').join(',')})`
        )
        .bind(...typeIds)
        .all<{ id: string; name: string; sort_order: number }>(),
      db
        .prepare(
          `SELECT id, name FROM component_variants WHERE id IN (${variantIds.map(() => '?').join(',')})`
        )
        .bind(...variantIds)
        .all<{ id: string; name: string }>(),
    ])

    const typeMap = new Map(typeRows.results.map(r => [r.id, r]))
    const variantMap = new Map(variantRows.results.map(r => [r.id, r.name]))

    const sorted = selectionEntries
      .map(([typeId, variantId]) => ({
        typeId,
        variantId,
        sortOrder: typeMap.get(typeId)?.sort_order ?? 99,
        typeName: typeMap.get(typeId)?.name ?? typeId,
        variantName: variantMap.get(variantId) ?? variantId,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    for (const item of sorted) {
      resolvedComponents.push({ typeName: item.typeName, variantName: item.variantName })
    }
  }

  return {
    brandId: brand.id,
    internalName: brand.internal_name || brand.id,
    geo: brand.geo || null,
    launchDate: brand.launch_date || null,
    mode: brand.mode || null,
    conceptName: conceptRow?.name || null,
    externalNamingNames: extNamingNames,
    internalNamingName: intNamingRow?.name || null,
    prPackageName: prPackageRow?.name || null,
    legalLanding: Boolean(brand.legal_landing),
    partnerLanding: Boolean(brand.partner_landing),
    delegateToDesigners: Boolean(brand.delegate_to_designers),
    developmentDeadline: brand.development_deadline || null,
    constructorUrl,

    brandBasicsComment,
    conceptComment: brand.concept_comment || null,
    externalNamingComment: brand.external_naming_comment || null,
    internalNamingComment: brand.internal_naming_comment || null,
    prPackageComment: brand.pr_package_comment || null,
    deliverablesComment: brand.deliverables_comment || null,
    componentsComment: brand.components_comment || null,

    resolvedComponents,
    ceoComments,

    prPackageTimeline: prPackageRow?.timeline || null,
    prPackageTeamsInvolved: prPackageRow?.teams_involved || null,
    prPackageComponentsList: prPackageRow?.components_list || null,
    prPackageRequirements: prPackageRow?.requirements || null,
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
  const isCreator = isBrandBriefCreatorRole(user.role)

  let query: string
  const params: (string | number)[] = []

  if (canSeeAll) {
    query = 'SELECT * FROM brands WHERE 1=1'
  } else if (isCreator) {
    query = 'SELECT * FROM brands WHERE created_by = ?'
    params.push(user.id)
  } else {
    // External teams (strategy / ui_designer / pr_marketing / product_designer)
    // can only browse approved brands.
    query = "SELECT * FROM brands WHERE status = 'approved'"
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
  const isCreator = isBrandBriefCreatorRole(user.role)

  let row: BrandRow | null

  if (canSeeAll) {
    // admin / head_dhc / cpo_ceo see any brand in any status
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

brands.post('/', async c => {
  const user = c.get('user')
  if (!isBrandBriefCreatorRole(user.role)) {
    return c.json(
      { success: false, error: 'Only Product Owner or Admin can create a new brand brief' },
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

  const EDITABLE_STATUSES: readonly BrandStatus[] = ['draft', 'needs_revision'] as const
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

/** Updates only `ceo_selections` — no status transition. Used by CEO re-select flows on Step 10. */
brands.patch('/:id/ceo-selections', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const rawBody = await c.req.json()
  const parsed = patchCeoSelectionsSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  if (!(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)) {
    return c.json(
      { success: false, error: 'Forbidden: only CEO/admin roles can update CEO selections' },
      403
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  const currentStatus = existing.status as BrandStatus
  if (currentStatus !== 'submitted' && currentStatus !== 'needs_revision') {
    return c.json(
      {
        success: false,
        error: 'CEO selections can only be edited while brand is submitted or needs_revision',
      },
      400
    )
  }

  await c.env.DB.prepare(
    `UPDATE brands SET ceo_selections = ?, updated_at = ? WHERE id = ?`
  )
    .bind(JSON.stringify(parsed.data.ceoSelections), new Date().toISOString(), id)
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()
  return c.json({ success: true, data: rowToBrand(row!) })
})

/**
 * Toggle the `resolved` flag of a single CEO comment.
 *
 * Used by the PO on the returned-from-CEO view ("Позначити як вирішений" /
 * "Повернути"). Only the brief owner may call this, and only while the brand
 * is in `needs_revision`. The comment must already exist in `ceo_comments`
 * (we don't create new entries here).
 */
brands.patch('/:id/ceo-comments/resolve', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const rawBody = await c.req.json()
  const parsed = patchCeoCommentResolveSchema.safeParse(rawBody)

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  const { section, resolved } = parsed.data

  if (!RESOLVABLE_SECTION_KEYS.has(section)) {
    return c.json(
      { success: false, error: `Section "${section}" is not resolvable` },
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404)
  }

  if (existing.created_by !== user.id) {
    return c.json(
      { success: false, error: 'Only the brand owner can resolve CEO comments' },
      403
    )
  }

  if (existing.status !== 'needs_revision') {
    return c.json(
      {
        success: false,
        error: 'CEO comments can only be resolved while brand is needs_revision',
      },
      400
    )
  }

  const current = parseCeoCommentsFromRow(existing.ceo_comments)
  if (!current || !current[section]) {
    return c.json(
      { success: false, error: `No CEO comment to resolve for section "${section}"` },
      404
    )
  }

  const now = new Date().toISOString()
  const updated: BrandCeoComments = {
    ...current,
    [section]: {
      value: current[section].value,
      resolved,
      resolvedAt: resolved ? now : null,
    },
  }

  await c.env.DB.prepare(`UPDATE brands SET ceo_comments = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify(updated), now, id)
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

  if (['approved', 'needs_revision'].includes(targetStatus)) {
    if (!(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden: only CPO/CEO, Admin, or Head DHC can approve or send back for revision',
        },
        403
      )
    }
  }

  const updates: string[] = ['status = ?', 'updated_at = ?']
  const values: (string | number | null)[] = [targetStatus, new Date().toISOString()]

  if (targetStatus === 'submitted' && currentStatus === 'needs_revision') {
    updates.push('ceo_comments = ?', 'ceo_selections = ?')
    values.push(null, null)
  }

  if (body.ceoComments !== undefined) {
    const normalised = normaliseCeoCommentsForStorage(body.ceoComments)
    updates.push('ceo_comments = ?')
    values.push(JSON.stringify(normalised))
  }
  if (body.ceoSelections !== undefined) {
    updates.push('ceo_selections = ?')
    values.push(JSON.stringify(body.ceoSelections))
  }

  values.push(id)

  await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run()

  if (
    (targetStatus === 'submitted' || targetStatus === 'needs_revision') &&
    c.env.SLACK_BOT_TOKEN
  ) {
    try {
      const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
        .bind(id)
        .first<BrandRow>()

      if (brand) {
        const notificationData = await collectBrandNotificationData(
          c.env.DB,
          brand,
          c.env.CONSTRUCTOR_URL ?? ''
        )

        if (targetStatus === 'submitted') {
          const hasNewBriefs = brand.new_concept_brief != null || brand.new_naming_brief != null

          if (hasNewBriefs) {
            const token = c.env.SLACK_BOT_TOKEN
            c.executionCtx.waitUntil(
              Promise.allSettled([
                sendSlackMessage(
                  token,
                  buildNewBriefsApprovalMessage(
                    c.env.SLACK_CHANNEL_APPROVALS,
                    notificationData,
                    brand
                  )
                ),
                sendSlackMessage(
                  token,
                  buildNewBriefsStrategyMessage(
                    c.env.SLACK_CHANNEL_STRATEGY,
                    notificationData,
                    brand
                  )
                ),
                sendSlackMessage(
                  token,
                  buildNewBriefsPrMessage(c.env.SLACK_CHANNEL_PR, notificationData)
                ),
                sendSlackMessage(
                  token,
                  buildNewBriefsDesignMessage(c.env.SLACK_CHANNEL_DESIGN, notificationData)
                ),
              ])
            )
          } else {
            const isResubmit = currentStatus === 'needs_revision'
            const message = isResubmit
              ? buildResubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
              : buildSubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
            c.executionCtx.waitUntil(sendSlackMessage(c.env.SLACK_BOT_TOKEN, message))
          }
        } else {
          // Slack message builders take flat `Record<string, string>`; pull
          // `.value` out of any meta-form entries before forwarding.
          const ceoCommentsRaw = body.ceoComments ?? {}
          const ceoCommentsData: Record<string, string> = {}
          for (const [k, v] of Object.entries(ceoCommentsRaw)) {
            const text = typeof v === 'string' ? v : v.value
            if (text && text.trim()) ceoCommentsData[k] = text
          }
          const ceoSelectionsData = body.ceoSelections ?? {}
          const resolvedSelections: Record<string, string> = {}

          const conceptId = firstId(ceoSelectionsData.concept)
          if (conceptId) {
            const row = await c.env.DB.prepare('SELECT name FROM concepts WHERE id = ?')
              .bind(conceptId)
              .first<{ name: string }>()
            if (row) resolvedSelections.concept = row.name
          }

          const externalNamingIds = asIdArray(ceoSelectionsData.externalNaming)
          if (externalNamingIds.length > 0) {
            const placeholders = externalNamingIds.map(() => '?').join(',')
            const rows = await c.env.DB.prepare(
              `SELECT name FROM external_namings WHERE id IN (${placeholders})`
            )
              .bind(...externalNamingIds)
              .all<{ name: string }>()
            if (rows.results.length > 0) {
              resolvedSelections.externalNaming = rows.results.map(r => r.name).join(', ')
            }
          }

          const internalNamingId = firstId(ceoSelectionsData.internalNaming)
          if (internalNamingId) {
            const row = await c.env.DB.prepare('SELECT name FROM internal_namings WHERE id = ?')
              .bind(internalNamingId)
              .first<{ name: string }>()
            if (row) resolvedSelections.internalNaming = row.name
          }

          const message = buildNeedsRevisionMessage(
            c.env.SLACK_CHANNEL_APPROVALS,
            notificationData,
            ceoCommentsData,
            Object.keys(resolvedSelections).length > 0 ? resolvedSelections : undefined
          )
          c.executionCtx.waitUntil(sendSlackMessage(c.env.SLACK_BOT_TOKEN, message))
        }
      }
    } catch (err) {
      console.error('Slack notification error (submitted/needs_revision):', err)
    }
  }

  if (targetStatus === 'approved') {
    const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
      .bind(id)
      .first<BrandRow>()

    if (brand) {
      const ceoSel: Record<string, string | string[]> = (() => {
        try {
          return JSON.parse(brand.ceo_selections || '{}')
        } catch {
          return {}
        }
      })()

      const finalConceptId = firstId(ceoSel.concept) || brand.concept_id || null
      const finalExtIds: string[] = (() => {
        const overrideIds = asIdArray(ceoSel.externalNaming)
        if (overrideIds.length > 0) return overrideIds
        try {
          return JSON.parse(brand.external_naming_ids || '[]')
        } catch {
          return []
        }
      })()
      const finalIntId = firstId(ceoSel.internalNaming) || brand.internal_naming_id || null

      const componentSelections: Record<string, string> = (() => {
        try {
          return JSON.parse(brand.component_selections || '{}')
        } catch {
          return {}
        }
      })()

      const batchStatements: ReturnType<typeof c.env.DB.prepare>[] = []

      if (finalConceptId !== brand.concept_id || ceoSel.externalNaming || ceoSel.internalNaming) {
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

      if (brand.pr_package_id) {
        batchStatements.push(
          c.env.DB.prepare(
            "UPDATE pr_packages SET used_in_brand_id = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(id, brand.pr_package_id)
        )
      }

      if (batchStatements.length > 0) {
        await c.env.DB.batch(batchStatements)
      }

      if (c.env.SLACK_BOT_TOKEN) {
        try {
          const notificationData = await collectBrandNotificationData(
            c.env.DB,
            brand,
            c.env.CONSTRUCTOR_URL ?? '',
            ceoSel
          )
          const token = c.env.SLACK_BOT_TOKEN
          c.executionCtx.waitUntil(
            Promise.allSettled([
              sendSlackMessage(
                token,
                buildStrategyMessage(c.env.SLACK_CHANNEL_STRATEGY, notificationData)
              ),
              sendSlackMessage(
                token,
                buildPrMarketingMessage(c.env.SLACK_CHANNEL_PR, notificationData)
              ),
              sendSlackMessage(
                token,
                buildProductDesignMessage(c.env.SLACK_CHANNEL_DESIGN, notificationData)
              ),
              sendSlackMessage(
                token,
                buildApprovedWorkflowMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
              ),
            ])
          )
        } catch (err) {
          console.error('Slack notification error (approved):', err)
        }
      }
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

export default brands
