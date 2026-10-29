import { ORDER_KIND_LABELS } from '@brand-constructor/shared'
import { countUk } from '@/utils/pluralUk'
import type { OrderCreatedCounts, OrderCreatedNames, OrderKind, OrderState } from '@brand-constructor/shared'

/**
 * How the Orders pages say things (brief-orders plan, phase 2a). Pure, so the
 * Admin's node tests can pin the words without mounting a component.
 */

export const ORDER_STATE_BADGES: Record<OrderState, { label: string; cls: string }> = {
  open: { label: 'В роботі', cls: 'badge--purple' },
  // The team sent what it made; the author picks next. Amber, as «На
  // доопрацюванні»: amber means the author has the next move (owner, 01.10).
  ready: { label: 'Чекає на замовника', cls: 'badge--amber' },
  cancelled: { label: 'Скасовано', cls: 'badge--gray' },
  closed: { label: 'Завершено', cls: 'badge--blue' },
}

/**
 * The «Замовлено» column of the orders table: «Концепт», «External Naming»,
 * «Internal Naming». Without «Новий» — an order is always for something new,
 * and the word only repeated itself down the column (owner, 07.10). The order
 * page keeps its own sentence («новий концепт і новий Internal Naming»).
 */
const ORDER_KIND_COLUMN_LABELS: Record<OrderKind, string> = {
  concept: 'Концепт',
  externalNaming: 'External Naming',
  internalNaming: 'Internal Naming',
}

/** «Концепт, Internal Naming»; a cancelled one is struck through by the caller. */
export function orderKindLabel(kind: OrderKind): string {
  return ORDER_KIND_COLUMN_LABELS[kind]
}

function plural(n: number, one: string, few: string, many: string): string {
  return countUk(n, one, few, many)
}

/** «1 концепт · 3 назви · 1 внутрішня», or «—» when nothing is made yet. */
export function createdSummary(c: OrderCreatedCounts): string {
  const parts: string[] = []
  if (c.concepts) parts.push(plural(c.concepts, 'концепт', 'концепти', 'концептів'))
  if (c.externalNamings) parts.push(plural(c.externalNamings, 'назва', 'назви', 'назв'))
  if (c.internalNamings) parts.push(plural(c.internalNamings, 'внутрішня', 'внутрішні', 'внутрішніх'))
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/** Names shown in a row of the orders table before «ще N». */
const CREATED_NAMES_SHOWN = 3

/**
 * What the team made, by name: «Golden Frontier · Frontiera, Goldfront» —
 * concepts, then names, then internal names. A count («1 концепт · 2 назви»)
 * said how much and hid what, and every order had to be opened to learn it
 * (owner, 07.10). `full` is the whole list for the tooltip.
 */
export function createdNamesSummary(names: OrderCreatedNames): { text: string; full: string } {
  const made = createdNamesGroups(names)
  const text = made.groups.map(g => g.names.join(', ')).join(' · ')
  if (!text) return { text: '—', full: '' }
  return { text: made.more > 0 ? `${text} · ще ${made.more}` : text, full: made.full }
}

/** Which glyph stands before the names: a concept, or names (external and internal alike). */
export type CreatedKind = 'concept' | 'naming'

export interface CreatedNamesGroups {
  /** The names shown, by kind — the table puts the kind's glyph before each group. */
  groups: { kind: CreatedKind; names: string[] }[]
  /** How many more there are («ще N»). */
  more: number
  /** The whole list, for the tooltip. */
  full: string
}

export function createdNamesGroups(names: OrderCreatedNames): CreatedNamesGroups {
  const all: { kind: CreatedKind; names: string[] }[] = [
    { kind: 'concept' as const, names: names.concepts },
    { kind: 'naming' as const, names: [...names.externalNamings, ...names.internalNamings] },
  ].filter(g => g.names.length > 0)
  const total = all.reduce((n, g) => n + g.names.length, 0)
  let left = CREATED_NAMES_SHOWN
  const groups = all
    .map(g => {
      const part = g.names.slice(0, left)
      left -= part.length
      return { kind: g.kind, names: part }
    })
    .filter(g => g.names.length > 0)
  return {
    groups,
    more: Math.max(0, total - CREATED_NAMES_SHOWN),
    full: all.map(g => g.names.join(', ')).join(' · '),
  }
}

export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('uk-UA')
}

/** The calendar day of a moment where the reader is, as `2026-11-20` — the form of a deadline. */
function localDay(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

/**
 * Whether the order kept its deadline — the one mark of the dates in the
 * orders table (owner, 07.10: the table is the history of orders, and it did
 * not say whether an order was made in time).
 * - `overdue`: the order is still in work and the deadline day has passed;
 * - `late`: it was sent to the customer on a day after the deadline.
 * The deadline day itself is still in time. An order without a deadline (an
 * Internal Naming alone has none) and a cancelled one get no mark.
 */
export type DeadlineMark = 'overdue' | 'late' | null

export function deadlineMark(
  order: { state: OrderState; deadline: string | null; readyAt: string | null },
  now: Date
): DeadlineMark {
  if (!order.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(order.deadline)) return null
  if (order.readyAt) {
    const ready = new Date(order.readyAt)
    return !Number.isNaN(ready.getTime()) && localDay(ready) > order.deadline ? 'late' : null
  }
  return order.state === 'open' && localDay(now) > order.deadline ? 'overdue' : null
}

/** The tooltips of the two marks. */
export const DEADLINE_MARK_TITLES: Record<Exclude<DeadlineMark, null>, string> = {
  overdue: 'Дедлайн минув, замовлення ще в роботі',
  late: 'Відправлено замовнику пізніше дедлайну',
}

/** A bare `2026-11-20` from a form answer as `20.11.2026`; any other text as is. */
export function formatAnswerValue(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : value
}

/**
 * The plate beside the brief's name: where the order stands for the team, and
 * once it is behind them, where the brief itself is (owner, 01.10: «пішов
 * далі» said nothing).
 */
export function orderBadge(state: OrderState, briefStatus: string): { label: string; cls: string } {
  if (state !== 'closed' || briefStatus === 'in_work') {
    return state === 'closed' ? { label: 'Обрано замовником', cls: 'badge--green' } : ORDER_STATE_BADGES[state]
  }
  if (briefStatus === 'approved') return { label: 'Затверджено', cls: 'badge--green' }
  if (briefStatus === 'needs_revision') return { label: 'На доопрацюванні', cls: 'badge--amber' }
  // Said as what is happening, like «На доопрацюванні» (owner, 01.10: «У CEO»
  // only said where the brief was).
  return { label: 'На погодженні в CEO', cls: 'badge--blue' }
}

export interface OrderNoteInput {
  state: OrderState
  briefStatus: string
  readyAt: string | null
  readyByName: string | null
  submittedAt: string | null
  approvedAt: string | null
}

/** One sentence under the title: what happened and whether the team still has work. */
export function orderStatusNote(o: OrderNoteInput): string | null {
  if (o.state === 'open') return null
  if (o.state === 'ready') {
    const who = o.readyByName ? `${o.readyByName}, ` : ''
    return `Відправлено замовнику (${who}${formatOrderDate(o.readyAt)}).`
  }
  if (o.state === 'cancelled') {
    return 'Замовник обрав інше з бібліотеки, замовлення скасовано. Робити нічого не треба.'
  }
  if (o.briefStatus === 'in_work') return 'Замовник обрав створене. Робити нічого не треба.'
  if (o.briefStatus === 'approved') return `Бриф затверджено ${formatOrderDate(o.approvedAt)}.`
  if (o.briefStatus === 'needs_revision') return 'CEO повернув бриф замовнику на доопрацювання.'
  return `Бриф на погодженні в CEO з ${formatOrderDate(o.submittedAt)}.`
}

/**
 * The plate beside an order's brief: only «Скасовано» — the one case the header
 * plate does not tell (owner, 01.10: «почему столько много обрано»).
 */
export function orderSectionBadge(section: { open: boolean; cancelled: boolean }): { label: string; cls: string } | null {
  return !section.open && section.cancelled ? { label: 'Скасовано', cls: 'badge--gray' } : null
}

/**
 * The Orders list's words in lower case — «новий концепт», «новий External
 * Naming», «новий Internal Naming» (full run 06.10, bug 3: the header said
 * «нова Internal Naming» and «нові назви (External Naming)», the list —
 * «Новий Internal Naming», «Новий External Naming»).
 */
const ORDER_KIND_PHRASES = Object.fromEntries(
  Object.entries(ORDER_KIND_LABELS).map(([k, v]) => [k, v.charAt(0).toLowerCase() + v.slice(1)])
) as Record<OrderKind, string>

/** «новий концепт і новий Internal Naming» — what this order is, for the page header. */
export function orderedSummary(kinds: OrderKind[]): string {
  const parts = kinds.map(k => ORDER_KIND_PHRASES[k])
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} і ${parts[parts.length - 1]}`
}

/** The domain check of an External Naming, in the Namings table's words. */
export function availabilityLabel(availability: string | null): string {
  if (availability === 'available') return '✓ Available'
  if (availability === 'sold') return '✗ Sold'
  return '? Unknown'
}
