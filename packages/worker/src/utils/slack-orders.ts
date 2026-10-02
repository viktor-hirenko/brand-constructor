import { ORDER_KINDS, type OrderKind } from '@brand-constructor/shared'
import { brandBriefUrl, packSectionTexts, sendSlackMessage, type SlackMessage } from './slack'

/**
 * The two order messages of the brief-orders plan, phase 3:
 * N1 — the team sent what it made to the author → bc-approvals;
 * N2 — the order is cancelled → bc-strategy, as a reply under the order
 * message (A2) when its `ts` is known, otherwise a plain message there.
 */

export interface CreatedNames {
  concepts: string[]
  externalNamings: string[]
  internalNamings: string[]
}

const quoted = (names: string[]) => names.map(n => `«${n}»`).join(', ')

/** «концепт «Sunburst»; назви «Sunbeam», «Sunray»; внутрішня назва «Inty»». */
export function createdSummaryText(created: CreatedNames): string {
  const parts: string[] = []
  if (created.concepts.length > 0) {
    parts.push(`${created.concepts.length === 1 ? 'концепт' : 'концепти'} ${quoted(created.concepts)}`)
  }
  if (created.externalNamings.length > 0) {
    parts.push(`${created.externalNamings.length === 1 ? 'назва' : 'назви'} ${quoted(created.externalNamings)}`)
  }
  if (created.internalNamings.length > 0) {
    parts.push(
      `${created.internalNamings.length === 1 ? 'внутрішня назва' : 'внутрішні назви'} ${quoted(created.internalNamings)}`
    )
  }
  return parts.join('; ')
}

export interface OrderReadyInput {
  brandId: string
  internalName: string
  adminUrl: string
  created: CreatedNames
  /** `<@U…>` when Slack knows the author by e-mail, otherwise the author's name. */
  author: string
}

/** N1: «Замовлення для New Brand #N готове» — the author picks it in the brief and sends it to the CEO. */
export function buildOrderReadyMessage(channel: string, input: OrderReadyInput): SlackMessage {
  const lines = [
    `:sparkles: Замовлення для *${input.internalName}* готове`,
    `*Створено:* ${createdSummaryText(input.created)}`,
    `*Замовник:* ${input.author}`,
    '',
    '_Оберіть створене у брифі та відправте на погодження CEO._',
  ]
  return {
    channel,
    // The fallback carries the mention too: it is what Slack notifies with.
    text: `Замовлення для ${input.internalName} готове — ${input.author}`,
    blocks: [
      ...packSectionTexts(lines).map(text => ({ type: 'section', text: { type: 'mrkdwn', text } })),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Відкрити бриф' },
            url: brandBriefUrl(input.adminUrl, input.brandId),
            action_id: 'open_brand_brief',
          },
        ],
      },
    ],
  }
}

/** One cancelled order and what the author picked from the library instead. */
export interface CancelledOrder {
  kind: OrderKind
  picked: string[]
  /** For a naming order dropped because the brief's concept changed: the new concept. */
  conceptChangedTo?: string | null
}

function cancelledPart(order: CancelledOrder): string | null {
  const n = order.picked.length
  if (order.kind === ORDER_KINDS.CONCEPT) return n > 0 ? `концепт ${quoted(order.picked)}` : null
  if (order.kind === ORDER_KINDS.EXTERNAL_NAMING) {
    return n > 0 ? `${n === 1 ? 'назву' : 'назви'} ${quoted(order.picked)}` : null
  }
  return n > 0 ? `внутрішню назву ${quoted(order.picked)}` : null
}

/** Why the order is off, as the end of «…скасовано: <reason>». */
export function cancelReason(orders: CancelledOrder[]): string {
  const picked = orders.map(cancelledPart).filter((p): p is string => p !== null)
  if (picked.length > 0) {
    const list = picked.length === 1 ? picked[0] : `${picked.slice(0, -1).join(', ')} і ${picked[picked.length - 1]}`
    return `замовник обрав з бібліотеки ${list}`
  }
  const concept = orders.find(o => o.conceptChangedTo)?.conceptChangedTo
  if (concept) return `замовник змінив концепт на «${concept}»`
  return 'замовник зняв замовлення'
}

export const BRIEF_DELETED_REASON = 'бриф видалено'

export interface OrderCancelledInput {
  internalName: string
  reason: string
  /** The team already sent what it made: nothing to stop, the made items go back to the library. */
  teamDone: boolean
  /** The order message (A2); without it the reply becomes a plain message in `fallbackChannel`. */
  orderChannel: string | null
  orderTs: string | null
  fallbackChannel: string
}

interface OrderBrief {
  id: string
  internal_name: string | null
  orders_ready_at?: string | null
  orders_slack_channel?: string | null
  orders_slack_ts?: string | null
}

/** Where «замовлення скасовано» goes: under the order message (A2) when its `ts` was kept. */
export function orderCancelledInput(brief: OrderBrief, reason: string, strategyChannel: string): OrderCancelledInput {
  return {
    internalName: brief.internal_name || brief.id,
    reason,
    teamDone: Boolean(brief.orders_ready_at),
    orderChannel: brief.orders_slack_channel ?? null,
    orderTs: brief.orders_slack_ts ?? null,
    fallbackChannel: strategyChannel,
  }
}

/** N2: «Замовлення для New Brand #N скасовано: … Можна не робити». */
export function buildOrderCancelledMessage(input: OrderCancelledInput): SlackMessage {
  const tail = input.teamDone ? 'Створене повертається в бібліотеку.' : 'Можна не робити.'
  const text = `:no_entry_sign: Замовлення для *${input.internalName}* скасовано: ${input.reason}. ${tail}`
  const threaded = Boolean(input.orderTs && input.orderChannel)
  return {
    channel: threaded ? input.orderChannel! : input.fallbackChannel,
    text: `Замовлення для ${input.internalName} скасовано: ${input.reason}. ${tail}`,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
    ...(threaded ? { thread_ts: input.orderTs! } : {}),
  }
}

/**
 * `<@U…>` for the author, found by e-mail (`users.lookupByEmail`, needs the
 * bot's `users:read.email`). Without the scope, an unknown address or a
 * network failure, the author's name as text — never an error.
 */
export async function slackMention(token: string, email: string | null, name: string): Promise<string> {
  if (!email) return name
  try {
    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = (await res.json()) as { ok: boolean; user?: { id?: string }; error?: string }
    if (data.ok && data.user?.id) return `<@${data.user.id}>`
    if (data.error !== 'users_not_found') console.error('Slack users.lookupByEmail:', data.error)
  } catch (err) {
    console.error('Slack users.lookupByEmail failed:', err)
  }
  return name
}

/** For the brief that is gone: there is no History left to record a failure in. */
export async function sendOrderCancelledForDeletedBrief(token: string, input: OrderCancelledInput): Promise<void> {
  await sendSlackMessage(token, buildOrderCancelledMessage(input))
}
