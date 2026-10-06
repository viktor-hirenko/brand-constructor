import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { BRAND_APPROVAL_ROLES, BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import type { BrandStatus } from '@brand-constructor/shared/types'
import {
  asIdArray,
  brandForRole,
  firstId,
  normaliseCeoCommentsForStorage,
  parseCeoCommentsFromRow,
  rowToBrand,
  STATUS_TRANSITIONS,
  updateStatusSchema,
  type BrandRow,
} from '../utils/brands'
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
} from '../utils/slack'
import { brandHasNewBriefs, enqueueJiraThenSlack } from '../utils/brand-export'
import { collectBrandNotificationData } from './brands.notifications'
import {
  appendWorkflowSnapshot,
  recordStatusWorkflowEvents,
} from '../utils/brand-workflow'
import { freeOfOtherBrands, pickedIds, takenByAnotherBrand } from '../utils/selection-taken'
import { BRIEF_CHANGED_MESSAGE } from './brands.crud'

const status = new Hono<{ Bindings: Env; Variables: Variables }>()

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

  // CEO comments and picks come only from the CEO (H-22): the author's
  // submission must not carry «CEO picks» that approval would then write.
  if (
    (body.ceoComments !== undefined || body.ceoSelections !== undefined) &&
    !(BRAND_APPROVAL_ROLES as readonly string[]).includes(user.role)
  ) {
    return c.json(
      { success: false, error: 'Forbidden: only CPO/CEO can send CEO comments or selections' },
      403
    )
  }

  const currentStatus = existing.status as BrandStatus
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] ?? []

  const isReadyForCeoResubmit =
    targetStatus === BRAND_BRIEF_STATUS.SUBMITTED &&
    currentStatus === BRAND_BRIEF_STATUS.SUBMITTED &&
    !brandHasNewBriefs(existing)

  if (!allowedTransitions.includes(targetStatus) && !isReadyForCeoResubmit) {
    return c.json(
      {
        success: false,
        error: `Invalid status transition: ${currentStatus} → ${targetStatus}`,
      },
      400
    )
  }

  if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
    if (existing.created_by !== user.id) {
      return c.json({ success: false, error: 'Only the brand owner can submit for review' }, 403)
    }
    if (
      currentStatus === BRAND_BRIEF_STATUS.SUBMITTED &&
      brandHasNewBriefs(existing)
    ) {
      return c.json(
        {
          success: false,
          error: 'Brief is still in work with teams — complete library selections before CEO review',
        },
        400
      )
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
    // The author's «свій варіант» marks answered this round's CEO alternatives
    // (`stepData.revisionKeptOwn`); the next round starts without them.
    updates.push(
      `step_data = CASE WHEN step_data IS NULL THEN NULL ELSE json_remove(step_data, '$.revisionKeptOwn') END`
    )
  }

  // The comments the CEO saved while typing (`PATCH /:id/ceo-comments`) stay;
  // what this request sends wins per section. A second CEO tab's comments are
  // on the brief even if the returning tab never saw them (H-30).
  const decidingFromReview = currentStatus === BRAND_BRIEF_STATUS.SUBMITTED
  const ceoComments =
    body.ceoComments !== undefined
      ? {
          ...(decidingFromReview ? parseCeoCommentsFromRow(existing.ceo_comments) ?? {} : {}),
          ...normaliseCeoCommentsForStorage(body.ceoComments),
        }
      : decidingFromReview
        ? parseCeoCommentsFromRow(existing.ceo_comments) ?? undefined
        : undefined
  if (body.ceoComments !== undefined) {
    updates.push('ceo_comments = ?')
    values.push(JSON.stringify(ceoComments))
  }
  if (body.ceoSelections !== undefined) {
    updates.push('ceo_selections = ?')
    values.push(JSON.stringify(body.ceoSelections))
  }

  if (targetStatus !== BRAND_BRIEF_STATUS.APPROVED) {
    values.push(id)
    await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    try {
      await recordStatusWorkflowEvents(c.env.DB, {
        brandId: id,
        userId: user.id,
        targetStatus,
        currentStatus,
        existing,
        ceoComments: ceoComments ?? body.ceoComments,
        ceoSelections: body.ceoSelections,
      })
    } catch (err) {
      console.error('Workflow event insert failed (status):', err)
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
        const notificationData = await collectBrandNotificationData(
          c.env.DB,
          brand,
          c.env.CONSTRUCTOR_URL ?? ''
        )

        if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
          const hasNewBriefs = brandHasNewBriefs(brand)

          if (hasNewBriefs) {
            const token = c.env.SLACK_BOT_TOKEN
            enqueueJiraThenSlack(
              c.executionCtx,
              c.env,
              c.env.DB,
              brand,
              notificationData,
              'new_briefs',
              async enriched =>
                Promise.allSettled([
                  sendSlackMessage(
                    token,
                    buildNewBriefsApprovalMessage(
                      c.env.SLACK_CHANNEL_APPROVALS,
                      enriched,
                      brand
                    )
                  ),
                  sendSlackMessage(
                    token,
                    buildNewBriefsStrategyMessage(
                      c.env.SLACK_CHANNEL_STRATEGY,
                      enriched,
                      brand
                    )
                  ),
                  sendSlackMessage(
                    token,
                    buildNewBriefsPrMessage(c.env.SLACK_CHANNEL_PR, enriched)
                  ),
                  sendSlackMessage(
                    token,
                    buildNewBriefsDesignMessage(c.env.SLACK_CHANNEL_DESIGN, enriched)
                  ),
                ])
            )
          } else {
            const isNeedsRevisionResubmit = currentStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION
            const message = isNeedsRevisionResubmit
              ? buildResubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
              : buildSubmittedMessage(c.env.SLACK_CHANNEL_APPROVALS, notificationData)
            c.executionCtx.waitUntil(sendSlackMessage(c.env.SLACK_BOT_TOKEN, message))
          }
        } else {
          // Slack message builders take flat `Record<string, string>`; pull
          // `.value` out of any meta-form entries before forwarding.
          const ceoCommentsRaw = ceoComments ?? body.ceoComments ?? {}
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

  if (targetStatus === BRAND_BRIEF_STATUS.APPROVED) {
    // The status flip and library `used` marks must be applied atomically:
    // if the brand row flipped to `approved` while the library marks failed
    // (network blip, D1 transient error), the same library element could
    // be picked again for another brand. D1 `db.batch` is all-or-nothing,
    // so on failure the brand stays in its current status and library rows
    // remain available. Slack is only enqueued AFTER the batch commits.

    const effectiveCeoSel: Record<string, string | string[]> = (() => {
      if (body.ceoSelections !== undefined) return body.ceoSelections
      try {
        return JSON.parse(existing.ceo_selections || '{}')
      } catch {
        return {}
      }
    })()

    const finalConceptId = firstId(effectiveCeoSel.concept) || existing.concept_id || null
    const finalExtIds: string[] = (() => {
      const overrideIds = asIdArray(effectiveCeoSel.externalNaming)
      if (overrideIds.length > 0) return overrideIds
      try {
        return JSON.parse(existing.external_naming_ids || '[]')
      } catch {
        return []
      }
    })()
    const finalIntId =
      firstId(effectiveCeoSel.internalNaming) || existing.internal_naming_id || null

    // H-09 (full run 06.10, bug 4): a concept or name another brand already
    // owns is not taken over — the CEO gets the reason, nothing is written.
    const picked = pickedIds({ conceptId: finalConceptId, externalIds: finalExtIds, internalId: finalIntId })
    const taken = await takenByAnotherBrand(c.env.DB, id, picked)
    if (taken) return c.json({ success: false, error: taken }, 409)

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

    // The brief flips only if none of its picks was taken in between by another
    // approval, and the library marks run only if THIS request flipped it — two
    // approvals in the same second cannot both take the same concept.
    const free = freeOfOtherBrands(id, picked)
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
      const lost = await takenByAnotherBrand(c.env.DB, id, picked)
      return c.json({ success: false, error: lost ?? BRIEF_CHANGED_MESSAGE }, 409)
    }

    try {
      await recordStatusWorkflowEvents(c.env.DB, {
        brandId: id,
        userId: user.id,
        targetStatus,
        currentStatus,
        existing,
        ceoComments: ceoComments ?? body.ceoComments,
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
          c.env.CONSTRUCTOR_URL ?? '',
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
            const token = c.env.SLACK_BOT_TOKEN
            return Promise.allSettled([
              sendSlackMessage(
                token,
                buildStrategyMessage(c.env.SLACK_CHANNEL_STRATEGY, enriched)
              ),
              sendSlackMessage(
                token,
                buildPrMarketingMessage(c.env.SLACK_CHANNEL_PR, enriched)
              ),
              sendSlackMessage(
                token,
                buildProductDesignMessage(c.env.SLACK_CHANNEL_DESIGN, enriched)
              ),
              sendSlackMessage(
                token,
                buildApprovedWorkflowMessage(c.env.SLACK_CHANNEL_APPROVALS, enriched)
              ),
            ])
          }
        )
      }
    } catch (err) {
      console.error('Post-approval notification error:', err)
    }
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: brandForRole(rowToBrand(row!), user.role) })
})

export default status
