import { z } from 'zod'
import { updateBrandSchema } from '../schemas/brand'
import type {
  Brand,
  BrandCeoComments,
  BrandStatus,
  CeoCommentMeta,
} from '@brand-constructor/shared/types'

/**
 * Allowed status transitions enforced by `PATCH /:id/status`. `approved` is a
 * terminal state — no outgoing edges.
 */
export const STATUS_TRANSITIONS: Record<BrandStatus, BrandStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'needs_revision'],
  needs_revision: ['submitted', 'approved'],
  approved: [],
}

/** Section keys that may carry a `resolved` flag (everything except `general`). */
export const RESOLVABLE_SECTION_KEYS = new Set([
  'basics',
  'concept',
  'externalNaming',
  'internalNaming',
  'marketingPackage',
  'deliverables',
  'visualComponents',
])

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

export const updateStatusSchema = z.object({
  status: z.enum(['draft', 'submitted', 'needs_revision', 'approved']),
  ceoComments: z.record(ceoCommentValueSchema).optional(),
  ceoSelections: z.record(ceoSelectionValueSchema).optional(),
})

export const patchCeoSelectionsSchema = z.object({
  ceoSelections: z.record(ceoSelectionValueSchema),
})

/** Body schema for `PATCH /:id/ceo-comments/resolve`. */
export const patchCeoCommentResolveSchema = z.object({
  section: z.string().min(1).max(100),
  resolved: z.boolean(),
})

export type UpdateBrandBody = z.infer<typeof updateBrandSchema>
export type FieldTransform = 'direct' | 'nullish' | 'bool' | 'json' | 'json_nullable'

export interface UpdatableField {
  key: keyof UpdateBrandBody
  column: string
  transform: FieldTransform
}

/**
 * Whitelist of fields the wizard `PUT /:id` handler may write. Anything not
 * listed here is silently ignored (F-18 hardening — clients can no longer push
 * arbitrary columns through the wizard endpoint).
 */
export const UPDATABLE_FIELDS: UpdatableField[] = [
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

export function applyFieldTransform(
  value: unknown,
  transform: FieldTransform
): string | number | null {
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
export function normaliseCeoCommentsForStorage(
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
export function parseCeoCommentsFromRow(raw: string | null): BrandCeoComments | null {
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
export function flattenCeoCommentsToValues(
  comments: BrandCeoComments | null
): Record<string, string> {
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
export function firstId(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value || null
}

export function asIdArray(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

export interface BrandRow {
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

export function rowToBrand(row: BrandRow): Brand {
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
