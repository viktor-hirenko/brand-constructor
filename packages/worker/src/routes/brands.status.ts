import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { BRAND_APPROVAL_ROLES } from '@brand-constructor/shared'
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
import { collectBrandNotificationData } from './brands.notifications'

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

  // Brand UPDATE columns shared across all status branches. The `approved`
  // branch later appends concept_id / external_naming_ids / internal_naming_id
  // and folds the whole UPDATE into a single atomic db.batch alongside the
  // library marks (F-04). All other branches execute it as a standalone
  // UPDATE here.
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

  if (targetStatus !== 'approved') {
    values.push(id)
    await c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()
  }

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
    // F-04: status flip + library marks are now a single atomic db.batch.
    // Previously the brand row UPDATE that flipped status to 'approved' ran
    // before this block (line 107-109) and library marks ran in a separate
    // batch below. If the marks batch failed (network blip, D1 transient
    // error) the brand was already 'approved' but the concept/external/
    // internal/pr_package rows were still 'available' — the same library
    // element could be picked again for another brand.
    //
    // Now everything is one db.batch. D1 batch is all-or-nothing: on
    // failure the brand stays in its current status and library elements
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
    values.push(id)

    const batchStatements: ReturnType<typeof c.env.DB.prepare>[] = [
      c.env.DB.prepare(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`).bind(...values),
    ]

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

    if (existing.pr_package_id) {
      batchStatements.push(
        c.env.DB.prepare(
          "UPDATE pr_packages SET used_in_brand_id = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(id, existing.pr_package_id)
      )
    }

    try {
      await c.env.DB.batch(batchStatements)
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

    // Slack is dispatched ONLY after the batch successfully commits. If the
    // batch threw above, we already returned 500 and never reach this point.
    if (c.env.SLACK_BOT_TOKEN) {
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
        }
      } catch (err) {
        console.error('Slack notification error (approved):', err)
      }
    }
  }

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>()

  return c.json({ success: true, data: rowToBrand(row!) })
})

export default status
