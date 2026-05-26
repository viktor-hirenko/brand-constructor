import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import {
  BRAND_APPROVAL_ROLES,
  BRAND_BRIEF_STATUS,
  isBrandBriefCreatorRole,
} from '@brand-constructor/shared'
import type { BrandWorkflowEvent, BrandWorkflowEventType } from '@brand-constructor/shared/types'
import {
  parseWorkflowEventMeta,
  type BrandWorkflowEventRow,
} from '../utils/brand-workflow'

const events = new Hono<{ Bindings: Env; Variables: Variables }>()

function canListAllBrands(role: string): boolean {
  return (BRAND_APPROVAL_ROLES as readonly string[]).includes(role) || role === 'admin'
}

function rowToWorkflowEvent(row: BrandWorkflowEventRow): BrandWorkflowEvent {
  return {
    id: row.id,
    brandId: row.brand_id,
    eventType: row.event_type as BrandWorkflowEventType,
    userId: row.user_id,
    userName: row.user_name ?? 'Unknown',
    userRole: row.user_role ?? '',
    createdAt: row.created_at,
    meta: parseWorkflowEventMeta(row.meta),
  }
}

events.get('/:id/workflow-events', async c => {
  const id = c.req.param('id')
  const user = c.get('user')
  const canSeeAll = canListAllBrands(user.role)
  const isCreator = isBrandBriefCreatorRole(user.role)

  if (canSeeAll) {
    const exists = await c.env.DB.prepare('SELECT id FROM brands WHERE id = ?')
      .bind(id)
      .first()
    if (!exists) {
      return c.json({ success: false, error: 'Brand not found' }, 404)
    }
  } else if (isCreator) {
    const own = await c.env.DB.prepare('SELECT id FROM brands WHERE id = ? AND created_by = ?')
      .bind(id, user.id)
      .first()
    if (!own) {
      return c.json({ success: false, error: 'Brand not found' }, 404)
    }
  } else {
    const approved = await c.env.DB.prepare('SELECT id FROM brands WHERE id = ? AND status = ?')
      .bind(id, BRAND_BRIEF_STATUS.APPROVED)
      .first()
    if (!approved) {
      return c.json({ success: false, error: 'Brand not found' }, 404)
    }
  }

  const result = await c.env.DB.prepare(
    `SELECT e.*, u.name AS user_name, u.role AS user_role
     FROM brand_workflow_events e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.brand_id = ?
     ORDER BY e.created_at DESC`
  )
    .bind(id)
    .all<BrandWorkflowEventRow>()

  return c.json({
    success: true,
    data: result.results.map(rowToWorkflowEvent),
  })
})

export default events
