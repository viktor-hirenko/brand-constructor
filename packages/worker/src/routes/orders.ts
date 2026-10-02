import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import {
  BRAND_BRIEF_STATUS,
  ORDER_KINDS,
  ORDER_SECTION_TITLES,
  conceptOrderAnswers,
  internalOrderAnswers,
  isOrderRole,
  namingOrderAnswers,
  type OrderKind,
} from '@brand-constructor/shared'
import type {
  BrandStatus,
  OrderDetail,
  OrderListItem,
  OrderListResponse,
  OrderSection,
  OrderState,
  OrderTab,
} from '@brand-constructor/shared/types'
import type { Env, Variables } from '../types'
import type { BrandRow } from '../utils/brands'
import { selectionFromRow } from '../utils/brief-checks'
import { collectBrandNotificationData } from './brands.notifications'
import { insertWorkflowEvent, WORKFLOW_EVENT_TYPES } from '../utils/brand-workflow'
import { dispatchSlack } from '../utils/slack-dispatch'
import { buildOrderReadyMessage, slackMention } from '../utils/slack-orders'
import {
  conceptOrder,
  internalOrderFeedback,
  cancelledKindsFromEvents,
  createdForKinds,
  loadCancelledKinds,
  loadCreatedForBrief,
  loadOrderedKinds,
  namingOrder,
  openOrderKinds,
  orderDeadline,
  orderedKinds,
  readyBlockers,
  type CreatedForBrief,
} from '../utils/orders'

/**
 * The Orders page of the Admin (brief-orders plan, phase 2a): briefs `in_work`
 * as the teams see them. It widens nobody's access to briefs — a team still
 * cannot open a brief that is not approved (`brands.crud.ts`); this answers
 * only with what the bc-strategy order message already carries.
 */

const orders = new Hono<{ Bindings: Env; Variables: Variables }>()

const requireOrderRole = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  if (!isOrderRole(c.get('user').role)) {
    return c.json({ success: false, error: 'Forbidden: orders are for the Strategy team' }, 403)
  }
  return next()
})

orders.use('*', requireOrderRole)

/** A brief that left `in_work` stays in Archive this long. */
const ARCHIVE_DAYS = 30

function orderState(
  row: BrandRow,
  ordered: OrderKind[],
  openKinds: OrderKind[],
  cancelled: OrderKind[]
): OrderState {
  if (row.status !== BRAND_BRIEF_STATUS.IN_WORK) return 'closed'
  if (openKinds.length > 0) return row.orders_ready_at ? 'ready' : 'open'
  // Nothing stands: every order was either replaced by a library pick
  // (cancelled) or closed by picking what the team made — also after the team
  // sent it, so the page says «Обрано замовником», not «Чекає на замовника».
  return ordered.length > 0 && ordered.every(k => cancelled.includes(k)) ? 'cancelled' : 'closed'
}

function tabOf(state: OrderState): OrderTab {
  if (state === 'open') return 'open'
  if (state === 'ready') return 'ready'
  return 'archive'
}

type ListRow = BrandRow & { author_name: string | null }

orders.get('/', async c => {
  const tabParam = c.req.query('tab')
  const tab: OrderTab = tabParam === 'ready' || tabParam === 'archive' ? tabParam : 'open'
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const rows = await c.env.DB.prepare(
    `SELECT b.*, u.name AS author_name
     FROM brands b LEFT JOIN users u ON u.id = b.created_by
     WHERE b.status = 'in_work'
        OR (b.sent_to_work_at IS NOT NULL AND COALESCE(b.submitted_at, b.updated_at) >= ?)
     ORDER BY COALESCE(b.sent_to_work_at, b.updated_at) DESC`
  )
    .bind(cutoff)
    .all<ListRow>()

  const ids = rows.results.map(r => r.id)
  const lastEventMeta = new Map<string, string>()
  const cancelMetas = new Map<string, string[]>()
  const counts = new Map<string, { concepts: number; externalNamings: number; internalNamings: number }>()
  if (ids.length > 0) {
    const marks = ids.map(() => '?').join(',')
    const events = await c.env.DB.prepare(
      `SELECT brand_id, meta FROM brand_workflow_events
       WHERE event_type = 'sent_to_work' AND brand_id IN (${marks})
       ORDER BY created_at, rowid`
    )
      .bind(...ids)
      .all<{ brand_id: string; meta: string }>()
    for (const e of events.results) lastEventMeta.set(e.brand_id, e.meta)

    // Only the current round's: a brief ordered again after the CEO's return
    // (phase 4) starts its cancellations afresh.
    const cancels = await c.env.DB.prepare(
      `SELECT e.brand_id, e.meta FROM brand_workflow_events e JOIN brands b ON b.id = e.brand_id
       WHERE e.event_type = 'order_cancelled' AND e.brand_id IN (${marks})
         AND (b.sent_to_work_at IS NULL OR e.created_at >= b.sent_to_work_at)`
    )
      .bind(...ids)
      .all<{ brand_id: string; meta: string }>()
    for (const e of cancels.results) cancelMetas.set(e.brand_id, [...(cancelMetas.get(e.brand_id) ?? []), e.meta])

    for (const [table, key] of [
      ['concepts', 'concepts'],
      ['external_namings', 'externalNamings'],
      ['internal_namings', 'internalNamings'],
    ] as const) {
      const made = await c.env.DB.prepare(
        `SELECT for_brand_id, COUNT(*) AS n FROM ${table} WHERE for_brand_id IN (${marks}) GROUP BY for_brand_id`
      )
        .bind(...ids)
        .all<{ for_brand_id: string; n: number }>()
      for (const m of made.results) {
        const entry = counts.get(m.for_brand_id) ?? { concepts: 0, externalNamings: 0, internalNamings: 0 }
        entry[key] = Number(m.n)
        counts.set(m.for_brand_id, entry)
      }
    }
  }

  const all: OrderListItem[] = rows.results.map(row => {
    const openKinds = openOrderKinds(row)
    const kinds = orderedKinds(
      lastEventMeta.get(row.id),
      row,
      counts.get(row.id) ?? { concepts: 0, externalNamings: 0, internalNamings: 0 }
    )
    const cancelledKinds = cancelledKindsFromEvents(cancelMetas.get(row.id) ?? [])
    const made = counts.get(row.id) ?? { concepts: 0, externalNamings: 0, internalNamings: 0 }
    return {
      brandId: row.id,
      brandName: row.internal_name || row.id,
      authorName: row.author_name ?? '—',
      briefStatus: row.status as BrandStatus,
      state: orderState(row, kinds, openKinds, cancelledKinds),
      kinds,
      openKinds,
      cancelledKinds,
      sentToWorkAt: row.sent_to_work_at ?? null,
      readyAt: row.orders_ready_at ?? null,
      deadline: orderDeadline(row),
      created: {
        concepts: kinds.includes(ORDER_KINDS.CONCEPT) ? made.concepts : 0,
        externalNamings:
          kinds.includes(ORDER_KINDS.EXTERNAL_NAMING) || kinds.includes(ORDER_KINDS.CONCEPT)
            ? made.externalNamings
            : 0,
        internalNamings: kinds.includes(ORDER_KINDS.INTERNAL_NAMING) ? made.internalNamings : 0,
      },
    }
  })

  const tally = { open: 0, ready: 0, archive: 0 }
  for (const item of all) tally[tabOf(item.state)] += 1

  const data: OrderListResponse = {
    items: all.filter(item => tabOf(item.state) === tab),
    counts: tally,
  }
  return c.json({ success: true, data })
})

async function buildDetail(db: D1Database, row: BrandRow, adminUrl: string): Promise<OrderDetail> {
  const allCreated = await loadCreatedForBrief(db, row.id)
  const [author, readyBy, orderedInfo, cancelled, data] = await Promise.all([
    db.prepare('SELECT name FROM users WHERE id = ?').bind(row.created_by).first<{ name: string }>(),
    row.orders_ready_by
      ? db.prepare('SELECT name FROM users WHERE id = ?').bind(row.orders_ready_by).first<{ name: string }>()
      : null,
    loadOrderedKinds(db, row, allCreated),
    loadCancelledKinds(db, row.id, row.sent_to_work_at),
    // The author's picks as A2 prints them; CEO alternatives never belong here.
    collectBrandNotificationData(db, row, adminUrl, {}),
  ])
  const ordered = orderedInfo.kinds
  const snapshot = orderedInfo.snapshot
  const created = createdForKinds(allCreated, ordered)
  const openKinds = openOrderKinds(row)
  const state = orderState(row, ordered, openKinds, cancelled)
  // Nothing is added once the order is sent to the author: the author was told about what is there.
  const inWork = row.status === BRAND_BRIEF_STATUS.IN_WORK && !row.orders_ready_at

  // A closed order's answers left the brief with it; the copy kept on the
  // `sent_to_work` event still says what the teams were asked for.
  const sections: OrderSection[] = ordered.map(kind => {
    const open = openKinds.includes(kind)
    const source = open
      ? kind === ORDER_KINDS.CONCEPT
        ? conceptOrder(row)
        : kind === ORDER_KINDS.EXTERNAL_NAMING
          ? namingOrder(row)
          : internalOrderFeedback(row)
      : (snapshot[kind] ?? null)
    const answers =
      source == null
        ? []
        : kind === ORDER_KINDS.CONCEPT
          ? conceptOrderAnswers(source as Record<string, unknown>)
          : kind === ORDER_KINDS.EXTERNAL_NAMING
            ? namingOrderAnswers(source as Record<string, unknown>)
            : internalOrderAnswers(source)
    return {
      kind,
      title: ORDER_SECTION_TITLES[kind],
      open,
      cancelled: cancelled.includes(kind),
      fromSnapshot: !open && answers.length > 0,
      answers,
    }
  })

  const blockers = state === 'open' ? readyBlockers(openKinds, created) : []

  // «Обрано» follows the author's current pick, not only the approval mark.
  const sel = selectionFromRow(row)
  const picked = new Set([sel.conceptId, ...sel.externalIds, sel.internalId].filter(Boolean))
  const markPicked = <T extends { id: string; usedInBrand: boolean }>(items: T[]) =>
    items.map(i => ({ ...i, usedInBrand: i.usedInBrand || picked.has(i.id) }))
  const shown = {
    concepts: markPicked(created.concepts),
    externalNamings: markPicked(created.externalNamings),
    internalNamings: markPicked(created.internalNamings),
  }

  return {
    brandId: row.id,
    brandName: row.internal_name || row.id,
    authorName: author?.name ?? '—',
    briefStatus: row.status as BrandStatus,
    state,
    sentToWorkAt: row.sent_to_work_at ?? null,
    readyAt: row.orders_ready_at ?? null,
    readyByName: readyBy?.name ?? null,
    submittedAt: row.submitted_at ?? null,
    approvedAt: row.approved_at ?? null,
    geo: data.geo,
    launchDate: data.launchDate,
    mode: data.mode,
    basicsComment: data.brandBasicsComment,
    selection: {
      conceptId: row.concept_id || null,
      conceptName: data.conceptName,
      conceptComment: data.conceptComment,
      externalNamingNames: data.externalNamingNames,
      externalNamingComment: data.externalNamingComment,
      internalNamingName: data.internalNamingName,
      internalNamingComment: data.internalNamingComment,
    },
    sections,
    created: shown,
    canAdd: {
      [ORDER_KINDS.CONCEPT]: inWork && openKinds.includes(ORDER_KINDS.CONCEPT),
      [ORDER_KINDS.EXTERNAL_NAMING]:
        inWork &&
        (openKinds.includes(ORDER_KINDS.EXTERNAL_NAMING) ||
          (openKinds.includes(ORDER_KINDS.CONCEPT) && created.concepts.length > 0)),
      [ORDER_KINDS.INTERNAL_NAMING]: inWork && openKinds.includes(ORDER_KINDS.INTERNAL_NAMING),
    },
    readyBlockers: blockers,
    canMarkReady: state === 'open' && blockers.length === 0,
  }
}

/** A brief that never went to the teams is not an order — 404, as for a missing one. */
async function loadOrderBrief(db: D1Database, brandId: string): Promise<BrandRow | null> {
  const row = await db.prepare('SELECT * FROM brands WHERE id = ?').bind(brandId).first<BrandRow>()
  if (!row) return null
  if (row.status !== BRAND_BRIEF_STATUS.IN_WORK && !row.sent_to_work_at) return null
  return row
}

orders.get('/:brandId', async c => {
  const row = await loadOrderBrief(c.env.DB, c.req.param('brandId'))
  if (!row) return c.json({ success: false, error: 'Order not found' }, 404)
  return c.json({ success: true, data: await buildDetail(c.env.DB, row, c.env.ADMIN_URL ?? '') })
})

function createdNames(created: CreatedForBrief) {
  return {
    concepts: created.concepts.map(x => x.name),
    externalNamings: created.externalNamings.map(x => x.name),
    internalNamings: created.internalNamings.map(x => x.name),
  }
}

/**
 * «Відправити замовнику». Conditional on the brief being exactly as
 * read: still `in_work`, not marked yet, and its orders untouched — so a team
 * pressing «Відправити замовнику» while the author replaces the order with a library pick
 * gets «оновіть сторінку» instead of announcing an order nobody waits for.
 */
orders.post('/:brandId/ready', async c => {
  const brandId = c.req.param('brandId')
  const user = c.get('user')
  const row = await loadOrderBrief(c.env.DB, brandId)
  if (!row) return c.json({ success: false, error: 'Order not found' }, 404)
  if (row.status !== BRAND_BRIEF_STATUS.IN_WORK) {
    return c.json({ success: false, error: 'Бриф уже не в роботі — оновіть сторінку.' }, 409)
  }
  if (row.orders_ready_at) {
    return c.json({ success: false, error: 'Замовлення вже відправлено замовнику.' }, 409)
  }
  const openKinds = openOrderKinds(row)
  if (openKinds.length === 0) {
    return c.json(
      { success: false, error: 'Замовник уже обрав з бібліотеки — замовлення скасовано.' },
      400
    )
  }
  const created = createdForKinds(await loadCreatedForBrief(c.env.DB, brandId), openKinds)
  const blockers = readyBlockers(openKinds, created)
  if (blockers.length > 0) {
    return c.json({ success: false, error: `Ще не можна відправити замовнику: ${blockers.join(' ')}` }, 400)
  }

  const now = new Date().toISOString()
  const result = await c.env.DB.prepare(
    `UPDATE brands SET orders_ready_at = ?, orders_ready_by = ?
     WHERE id = ? AND status = 'in_work' AND orders_ready_at IS NULL
       AND new_concept_brief IS ? AND new_naming_brief IS ?
       AND (CASE WHEN json_valid(step_data) THEN json_extract(step_data, '$.internalNaming.newNamingFeedback') END) IS ?`
  )
    .bind(
      now,
      user.id,
      brandId,
      row.new_concept_brief,
      row.new_naming_brief,
      storedInternalFeedbackRaw(row.step_data)
    )
    .run()
  if (result.meta.changes !== 1) {
    return c.json({ success: false, error: 'Бриф змінено — оновіть сторінку.' }, 409)
  }

  try {
    await insertWorkflowEvent(c.env.DB, brandId, WORKFLOW_EVENT_TYPES.ORDERS_READY, user.id, {
      orders: openKinds,
      created: createdNames(created),
    })
  } catch (err) {
    console.error('Workflow event insert failed (orders_ready):', err)
  }

  // N1, once: only the request whose conditional UPDATE won gets here.
  if (c.env.SLACK_BOT_TOKEN) {
    c.executionCtx.waitUntil(
      notifyOrderReady(c.env, row, created, user.id).catch(err =>
        console.error('Slack notification error (orders_ready):', err)
      )
    )
  }

  const fresh = (await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(brandId).first<BrandRow>())!
  return c.json({ success: true, data: await buildDetail(c.env.DB, fresh, c.env.ADMIN_URL ?? '') })
})

/** «Замовлення для New Brand #N готове» to bc-approvals, the author mentioned. */
async function notifyOrderReady(env: Env, row: BrandRow, created: CreatedForBrief, userId: string): Promise<void> {
  const author = await env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
    .bind(row.created_by)
    .first<{ name: string; email: string }>()
  const message = buildOrderReadyMessage(env.SLACK_CHANNEL_APPROVALS, {
    brandId: row.id,
    internalName: row.internal_name || row.id,
    adminUrl: env.ADMIN_URL ?? '',
    created: createdNames(created),
    author: await slackMention(env.SLACK_BOT_TOKEN, author?.email ?? null, author?.name ?? 'замовник'),
  })
  await dispatchSlack(env.DB, env.SLACK_BOT_TOKEN, row.id, userId, [{ kind: 'approvals', message }])
}

/** The raw stored feedback, the value `json_extract` returns for it (or null). */
function storedInternalFeedbackRaw(stepData: string | null): string | null {
  if (!stepData) return null
  try {
    const parsed = JSON.parse(stepData) as { internalNaming?: { newNamingFeedback?: unknown } }
    const value = parsed?.internalNaming?.newNamingFeedback
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export default orders
