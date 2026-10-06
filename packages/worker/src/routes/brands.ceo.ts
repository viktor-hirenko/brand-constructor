import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { BRAND_APPROVAL_ROLES, BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import type { BrandCeoComments, BrandStatus } from '@brand-constructor/shared/types'
import {
  CEO_COMMENT_SECTION_KEYS,
  parseCeoCommentsFromRow,
  patchCeoCommentDraftSchema,
  patchCeoCommentResolveSchema,
  patchCeoSelectionsSchema,
  RESOLVABLE_SECTION_KEYS,
  rowToBrand,
  type BrandRow,
} from '../utils/brands'
import {
  buildPoCommentResolvedMeta,
  buildSelectionChangesMeta,
  insertWorkflowEvent,
  WORKFLOW_EVENT_TYPES,
} from '../utils/brand-workflow'
import { checkSelectable, pickedFromCeoSelections } from '../utils/orders'

const ceo = new Hono<{ Bindings: Env; Variables: Variables }>()

/** Updates only `ceo_selections` — no status transition. Used by CEO re-select flows on Step 10. */
ceo.patch('/:id/ceo-selections', async c => {
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
      { success: false, error: 'Forbidden: only CPO/CEO can update CEO selections' },
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
  if (
    currentStatus !== BRAND_BRIEF_STATUS.SUBMITTED &&
    currentStatus !== BRAND_BRIEF_STATUS.NEEDS_REVISION
  ) {
    return c.json(
      {
        success: false,
        error: 'CEO selections can only be edited while brand is submitted or needs_revision',
      },
      400
    )
  }

  // The CEO may not offer what another brief's order made or another brand uses.
  const taken = await checkSelectable(
    c.env.DB,
    id,
    pickedFromCeoSelections(parsed.data.ceoSelections)
  )
  if (taken) return c.json({ success: false, error: taken }, 400)

  await c.env.DB.prepare(
    `UPDATE brands SET ceo_selections = ?, updated_at = ? WHERE id = ?`
  )
    .bind(JSON.stringify(parsed.data.ceoSelections), new Date().toISOString(), id)
    .run()

  try {
    const selections = await buildSelectionChangesMeta(
      c.env.DB,
      existing,
      parsed.data.ceoSelections
    )
    await insertWorkflowEvent(c.env.DB, id, WORKFLOW_EVENT_TYPES.CEO_SELECTION_UPDATE, user.id, {
      selections,
    })
  } catch (err) {
    console.error('Workflow event insert failed (ceo-selections):', err)
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()
  return c.json({ success: true, data: rowToBrand(row!) })
})

/**
 * Saves one CEO comment while the CEO types, before «Повернути» / «Затвердити».
 *
 * Until 05.10 the comments reached the server only with the status change, so
 * another computer showed none (H-04) and a second CEO tab lost its comments to
 * the return from the first (H-30). One section per request, written with
 * `json_set` / `json_remove` in a single UPDATE: two tabs saving different
 * sections never overwrite each other. An empty value removes the comment.
 *
 * Only the CEO, only while the brief is `submitted`. The brief's version
 * (`updated_at`) does not move: a comment is the CEO's note on the brief, not
 * a change of it. The author does not see these until the return
 * (`GET /:id` hides them while `submitted`).
 */
ceo.patch('/:id/ceo-comments', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const parsed = patchCeoCommentDraftSchema.safeParse(await c.req.json())

  if (!parsed.success) {
    return c.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      400
    )
  }

  if (!(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)) {
    return c.json({ success: false, error: 'Forbidden: only CPO/CEO can write CEO comments' }, 403)
  }

  const { section } = parsed.data
  if (!CEO_COMMENT_SECTION_KEYS.has(section)) {
    return c.json({ success: false, error: `Section "${section}" takes no CEO comment` }, 400)
  }

  const value = parsed.data.value.trim()
  const path = `$.${section}`
  const statement = value
    ? c.env.DB.prepare(
        `UPDATE brands SET ceo_comments = json_set(COALESCE(ceo_comments, '{}'), ?, json(?))
         WHERE id = ? AND status = ?`
      ).bind(path, JSON.stringify({ value, resolved: false, resolvedAt: null }), id, BRAND_BRIEF_STATUS.SUBMITTED)
    : c.env.DB.prepare(
        `UPDATE brands SET ceo_comments = CASE
           WHEN json_remove(COALESCE(ceo_comments, '{}'), ?) = '{}' THEN NULL
           ELSE json_remove(COALESCE(ceo_comments, '{}'), ?) END
         WHERE id = ? AND status = ?`
      ).bind(path, path, id, BRAND_BRIEF_STATUS.SUBMITTED)

  const result = await statement.run()
  if (result.meta.changes !== 1) {
    const exists = await c.env.DB.prepare('SELECT 1 FROM brands WHERE id = ?').bind(id).first()
    if (!exists) return c.json({ success: false, error: 'Brand not found' }, 404)
    return c.json(
      { success: false, error: 'CEO comments can be written only while the brief is submitted' },
      400
    )
  }

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
ceo.patch('/:id/ceo-comments/resolve', async c => {
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

  if (existing.status !== BRAND_BRIEF_STATUS.NEEDS_REVISION) {
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

  try {
    await insertWorkflowEvent(
      c.env.DB,
      id,
      WORKFLOW_EVENT_TYPES.PO_COMMENT_RESOLVED,
      user.id,
      buildPoCommentResolvedMeta(section, resolved)
    )
  } catch (err) {
    console.error('Workflow event insert failed (comment resolve):', err)
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()
  return c.json({ success: true, data: rowToBrand(row!) })
})

export default ceo
