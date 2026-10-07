import { ORDER_KIND_LABELS } from '@brand-constructor/shared'
import { countUk } from '@/utils/pluralUk'
import type { OrderCreatedCounts, OrderKind, OrderState } from '@brand-constructor/shared'

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

/** «Новий концепт, Новий Internal Naming»; a cancelled one is struck through by the caller. */
export function orderKindLabel(kind: OrderKind): string {
  return ORDER_KIND_LABELS[kind]
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

export function formatOrderDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('uk-UA')
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
