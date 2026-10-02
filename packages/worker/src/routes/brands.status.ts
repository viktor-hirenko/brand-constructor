import { Hono, type Context } from 'hono'
import type { Env, Variables } from '../types'
import { BRAND_APPROVAL_ROLES, BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import type { BrandStatus } from '@brand-constructor/shared/types'
import {
  asIdArray,
  firstId,
  normaliseCeoCommentsForStorage,
  rowToBrand,
  STATUS_TRANSITIONS,
  updateStatusSchema,
  type BrandRow,
} from '../utils/brands'
import {
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
} from '../utils/slack'
import { enqueueJiraThenSlack } from '../utils/brand-export'
import { collectBrandNotificationData } from './brands.notifications'
import {
  appendWorkflowSnapshot,
  recordStatusWorkflowEvents,
} from '../utils/brand-workflow'
import {
  BRIEF_CHANGED_MESSAGE,
  BRIEF_HAS_ORDERS_MESSAGE,
  briefHasOrders,
  finalSelection,
  selectionFromRow,
  validateBriefCompleteness,
} from '../utils/brief-checks'
import { dispatchSlack } from '../utils/slack-dispatch'
import {
  checkSelectable,
  pickedFromSelection,
  releaseUnpickedOnApprovalStatements,
  selectionFreeCondition,
} from '../utils/orders'

const status = new Hono<{ Bindings: Env; Variables: Variables }>()

function parseCeoSelections(raw: string | null): Record<string, string | string[]> {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

status.patch('/:id/status', async c => {
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

  // `in_work → approved | needs_revision` is not an edge: the CEO cannot act
  // on a brief the teams are still fulfilling (H-15).
  if (!allowedTransitions.includes(targetStatus)) {
    return c.json(
      {
        success: false,
        error: `Invalid status transition: ${currentStatus} → ${targetStatus}`,
      },
      400
    )
  }

  if (targetStatus === BRAND_BRIEF_STATUS.IN_WORK || targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
    if (existing.created_by !== user.id) {
      return c.json({ success: false, error: 'Only the brand owner can submit for review' }, 403)
    }
  }

  if (
    targetStatus === BRAND_BRIEF_STATUS.APPROVED ||
    targetStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION
  ) {
    if (!(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)) {
      return c.json(
        {
          success: false,
          error: 'Forbidden: only CPO/CEO can approve or send back for revision',
        },
        403
      )
    }
  }

  if (targetStatus === BRAND_BRIEF_STATUS.IN_WORK && !briefHasOrders(existing)) {
    return c.json(
      { success: false, error: 'У брифі немає замовлень. Відправте його на погодження CEO.' },
      400
    )
  }

  if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
    if (briefHasOrders(existing)) {
      // A draft with an order now goes `→ in_work`; only a tab opened before
      // that release still asks for `submitted`.
      const error =
        currentStatus === BRAND_BRIEF_STATUS.DRAFT
          ? 'Сторінка застаріла. Оновіть її (F5) і відправте бриф ще раз.'
          : BRIEF_HAS_ORDERS_MESSAGE
      return c.json({ success: false, error }, 400)
    }
    const incomplete = await validateBriefCompleteness(c.env.DB, selectionFromRow(existing))
    if (incomplete) return c.json({ success: false, error: incomplete }, 400)
  }

  // What approval writes: the CEO's picks over the author's (H-02 — a brief
  // must not be approved without a concept and its External Naming).
  const effectiveCeoSel: Record<string, string | string[]> =
    body.ceoSelections !== undefined ? body.ceoSelections : parseCeoSelections(existing.ceo_selections)

  if (targetStatus === BRAND_BRIEF_STATUS.APPROVED) {
    if (briefHasOrders(existing)) {
      return c.json(
        { success: false, error: 'У брифі є незакрите замовлення — затвердити його не можна.' },
        400
      )
    }
    const incomplete = await validateBriefCompleteness(
      c.env.DB,
      finalSelection(existing, effectiveCeoSel)
    )
    if (incomplete) return c.json({ success: false, error: incomplete }, 400)
    // H-09: approving must not take what another brand already uses, nor what
    // another brief's order made.
    const taken = await checkSelectable(
      c.env.DB,
      id,
      pickedFromSelection(finalSelection(existing, effectiveCeoSel))
    )
    if (taken) return c.json({ success: false, error: taken }, 409)
  }

  // Brand UPDATE columns shared across all status branches. The `approved`
  // branch later appends concept_id / external_naming_ids / internal_naming_id
  // and folds the whole UPDATE into a single atomic db.batch alongside the
  // library marks (see the approval block below). All other branches
  // execute it as a standalone UPDATE here.
  const now = new Date().toISOString()
  const updates: string[] = ['status = ?', 'updated_at = ?']
  const values: (string | number | null)[] = [targetStatus, now]

  appendWorkflowSnapshot(targetStatus, currentStatus, user.id, existing, now, updates, values)

  if (
    targetStatus === BRAND_BRIEF_STATUS.SUBMITTED &&
    currentStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION
  ) {
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

  // Every write is conditional on the status read above. Of two requests that
  // race (double click, second tab) exactly one changes the row; the other gets
  // 409 and sends no message and writes no event (H-23).
  if (targetStatus !== BRAND_BRIEF_STATUS.APPROVED) {
    values.push(id, currentStatus)
    const result = await c.env.DB.prepare(
      `UPDATE brands SET ${updates.join(', ')} WHERE id = ? AND status = ?`
    )
      .bind(...values)
      .run()
    if (result.meta.changes !== 1) {
      return c.json({ success: false, error: BRIEF_CHANGED_MESSAGE }, 409)
    }

    try {
      await recordStatusWorkflowEvents(c.env.DB, {
        brandId: id,
        userId: user.id,
        targetStatus,
        currentStatus,
        existing,
        ceoComments: body.ceoComments,
        ceoSelections: body.ceoSelections,
      })
    } catch (err) {
      console.error('Workflow event insert failed (status):', err)
    }
  }

  if (targetStatus === BRAND_BRIEF_STATUS.IN_WORK) {
    try {
      await notifySentToWork(c, id, user.id)
    } catch (err) {
      console.error('Slack notification error (in_work):', err)
    }
  }

  if (
    (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED ||
      targetStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION) &&
    c.env.SLACK_BOT_TOKEN
  ) {
    try {
      const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
        .bind(id)
        .first<BrandRow>()

      if (brand) {
        // «Обрано» is the author's pick: the row already holds the CEO's
        // alternatives, which the message names separately (H-05).
        const notificationData = await collectBrandNotificationData(
          c.env.DB,
          brand,
          c.env.ADMIN_URL ?? '',
          {}
        )

        if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
          const message =
            currentStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION
              ? buildResubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
              : buildSubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
          c.executionCtx.waitUntil(
            dispatchSlack(c.env.DB, c.env.SLACK_BOT_TOKEN, id, user.id, [
              { kind: 'approvals', message },
            ])
          )
        } else {
          // Slack message builders take flat `Record<string, string>`; pull
          // `.value` out of any meta-form entries before forwarding.
          const ceoCommentsRaw = body.ceoComments ?? {}
          const ceoCommentsData: Record<string, string> = {}
          for (const [k, v] of Object.entries(ceoCommentsRaw)) {
            const text = typeof v === 'string' ? v : v.value
            if (text && text.trim()) ceoCommentsData[k] = text
          }
          // «Альтернатива CEO»: what the CEO picked — sent now or saved before.
          const resolvedSelections = await resolveSelectionNames(c.env.DB, effectiveCeoSel)

          const message = buildNeedsRevisionMessage(
            c.env.SLACK_CHANNEL_APPROVALS,
            notificationData,
            ceoCommentsData,
            Object.keys(resolvedSelections).length > 0 ? resolvedSelections : undefined
          )
          c.executionCtx.waitUntil(
            dispatchSlack(c.env.DB, c.env.SLACK_BOT_TOKEN, id, user.id, [
              { kind: 'approvals', message },
            ])
          )
        }
      }
    } catch (err) {
      console.error('Slack notification error (submitted/needs_revision):', err)
    }
  }

  if (targetStatus === BRAND_BRIEF_STATUS.APPROVED) {
    // The status flip and library `used` marks must be applied atomically:
    // if the brand row flipped to `approved` while the library marks failed
    // (network blip, D1 transient error), the same library element could
    // be picked again for another brand. D1 `db.batch` is all-or-nothing,
    // so on failure the brand stays in its current status and library rows
    // remain available. Slack is only enqueued AFTER the batch commits.

    const { conceptId: finalConceptId, externalIds: finalExtIds, internalId: finalIntId } =
      finalSelection(existing, effectiveCeoSel)

    // Append CEO override columns to the brand UPDATE (shared columns were
    // already collected above: status, updated_at, optional ceo_comments,
    // optional ceo_selections).
    if (effectiveCeoSel.concept) {
      updates.push('concept_id = ?')
      values.push(finalConceptId)
    }
    if (effectiveCeoSel.externalNaming) {
      updates.push('external_naming_ids = ?')
      values.push(JSON.stringify(finalExtIds))
    }
    if (effectiveCeoSel.internalNaming) {
      updates.push('internal_naming_id = ?')
      values.push(finalIntId)
    }
    values.push(id, currentStatus)

    // The brief flips only if none of its final picks was taken in between by
    // another approval or another brief's order (H-09); otherwise nothing in
    // the batch changes and the CEO gets 409.
    const free = selectionFreeCondition(
      id,
      pickedFromSelection({ conceptId: finalConceptId, externalIds: finalExtIds, internalId: finalIntId })
    )

    // The library marks run only when the brand row above became `approved`
    // with THIS request's timestamp — a losing racer's batch changes nothing.
    const wonThisRequest = `EXISTS (SELECT 1 FROM brands WHERE id = ? AND status = 'approved' AND approved_at = ?)`

    const batchStatements: ReturnType<typeof c.env.DB.prepare>[] = [
      c.env.DB.prepare(
        `UPDATE brands SET ${updates.join(', ')} WHERE id = ? AND status = ?${free.sql}`
      ).bind(...values, ...free.binds),
    ]

    if (finalConceptId) {
      batchStatements.push(
        c.env.DB.prepare(
          `UPDATE concepts SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ? AND ${wonThisRequest}`
        ).bind(id, finalConceptId, id, now)
      )
    }

    for (const extId of finalExtIds) {
      if (extId) {
        batchStatements.push(
          c.env.DB.prepare(
            `UPDATE external_namings SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ? AND ${wonThisRequest}`
          ).bind(id, extId, id, now)
        )
      }
    }

    if (finalIntId) {
      batchStatements.push(
        c.env.DB.prepare(
          `UPDATE internal_namings SET used_in_brand_id = ?, status = 'used', updated_at = datetime('now') WHERE id = ? AND ${wonThisRequest}`
        ).bind(id, finalIntId, id, now)
      )
    }

    // What the teams made for this brief and it did not pick goes back to the library.
    batchStatements.push(
      ...releaseUnpickedOnApprovalStatements(c.env.DB, id, { sql: wonThisRequest, binds: [id, now] })
    )

    let batchResults: D1Result[]
    try {
      batchResults = await c.env.DB.batch(batchStatements)
    } catch (err) {
      console.error('Approve atomic batch failed:', err)
      return c.json(
        {
          success: false,
          error:
            'Failed to approve brand: atomic database update failed. No changes were applied.',
        },
        500
      )
    }
    if (batchResults[0]?.meta.changes !== 1) {
      const taken = await checkSelectable(
        c.env.DB,
        id,
        pickedFromSelection({ conceptId: finalConceptId, externalIds: finalExtIds, internalId: finalIntId })
      )
      return c.json({ success: false, error: taken ?? BRIEF_CHANGED_MESSAGE }, 409)
    }

    try {
      await recordStatusWorkflowEvents(c.env.DB, {
        brandId: id,
        userId: user.id,
        targetStatus,
        currentStatus,
        existing,
        ceoComments: body.ceoComments,
        ceoSelections: body.ceoSelections,
      })
    } catch (err) {
      console.error('Workflow event insert failed (approved):', err)
    }

    // Slack is dispatched ONLY after the batch successfully commits. If the
    // batch threw above, we already returned 500 and never reach this point.
    try {
      const refreshed = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
        .bind(id)
        .first<BrandRow>()
      if (refreshed) {
        const notificationData = await collectBrandNotificationData(
          c.env.DB,
          refreshed,
          c.env.ADMIN_URL ?? '',
          effectiveCeoSel
        )

        enqueueJiraThenSlack(
          c.executionCtx,
          c.env,
          c.env.DB,
          refreshed,
          notificationData,
          'ceo_approved',
          async enriched => {
            if (!c.env.SLACK_BOT_TOKEN) return
            return dispatchSlack(c.env.DB, c.env.SLACK_BOT_TOKEN, id, user.id, [
              { kind: 'strategy', message: buildStrategyMessage(c.env.SLACK_CHANNEL_STRATEGY, enriched) },
              { kind: 'pr', message: buildPrMarketingMessage(c.env.SLACK_CHANNEL_PR, enriched) },
              { kind: 'design', message: buildProductDesignMessage(c.env.SLACK_CHANNEL_DESIGN, enriched) },
              {
                kind: 'approvals',
                message: buildApprovedWorkflowMessage(c.env.SLACK_CHANNEL_APPROVALS, enriched),
              },
            ])
          }
        )
      }
    } catch (err) {
      console.error('Post-approval notification error:', err)
    }
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) })
})

type StatusContext = Context<{ Bindings: Env; Variables: Variables }>

/**
 * `→ in_work`: the four messages the teams got before this status existed
 * (A1–A4 of the plan) and the Jira Initiative, unchanged in content. The
 * bc-strategy message's `ts` is kept on the brief — phase 3 answers the order
 * in its thread («замовлення скасовано»).
 */
async function notifySentToWork(c: StatusContext, id: string, userId: string): Promise<void> {
  const token = c.env.SLACK_BOT_TOKEN
  const brand = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?')
    .bind(id)
    .first<BrandRow>()
  if (!brand) return
  const notificationData = await collectBrandNotificationData(
    c.env.DB,
    brand,
    c.env.ADMIN_URL ?? ''
  )
  enqueueJiraThenSlack(
    c.executionCtx,
    c.env,
    c.env.DB,
    brand,
    notificationData,
    'new_briefs',
    async enriched => {
      if (!token) return
      const results = await dispatchSlack(c.env.DB, token, id, userId, [
        {
          kind: 'approvals',
          message: buildNewBriefsApprovalMessage(c.env.SLACK_CHANNEL_APPROVALS, enriched, brand),
        },
        {
          kind: 'strategy',
          message: buildNewBriefsStrategyMessage(c.env.SLACK_CHANNEL_STRATEGY, enriched, brand),
        },
        { kind: 'pr', message: buildNewBriefsPrMessage(c.env.SLACK_CHANNEL_PR, enriched) },
        { kind: 'design', message: buildNewBriefsDesignMessage(c.env.SLACK_CHANNEL_DESIGN, enriched) },
      ])
      const order = results.find(r => r.kind === 'strategy')
      if (order?.ok && order.ts) {
        try {
          await c.env.DB.prepare(
            'UPDATE brands SET orders_slack_channel = ?, orders_slack_ts = ? WHERE id = ?'
          )
            .bind(order.channel, order.ts, id)
            .run()
        } catch (err) {
          console.error('Failed to keep the order message ts:', err)
        }
      }
    }
  )
}

/** CEO picks → library names, for the «повернуто» message. */
async function resolveSelectionNames(
  db: D1Database,
  ceoSelectionsData: Record<string, string | string[]>
): Promise<Record<string, string>> {
  const resolvedSelections: Record<string, string> = {}

  const conceptId = firstId(ceoSelectionsData.concept)
  if (conceptId) {
    const row = await db.prepare('SELECT name FROM concepts WHERE id = ?')
      .bind(conceptId)
      .first<{ name: string }>()
    if (row) resolvedSelections.concept = row.name
  }

  const externalNamingIds = asIdArray(ceoSelectionsData.externalNaming)
  if (externalNamingIds.length > 0) {
    const placeholders = externalNamingIds.map(() => '?').join(',')
    const rows = await db.prepare(
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
    const row = await db.prepare('SELECT name FROM internal_namings WHERE id = ?')
      .bind(internalNamingId)
      .first<{ name: string }>()
    if (row) resolvedSelections.internalNaming = row.name
  }

  return resolvedSelections
}

export default status
