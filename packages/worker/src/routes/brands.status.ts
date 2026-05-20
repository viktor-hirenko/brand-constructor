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

export default status
