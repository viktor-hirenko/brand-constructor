import type { OrderKind } from '../constants/orderQuestionLabels'
import type { BrandStatus } from './brand'

/**
 * The Orders page of the Admin (brief-orders plan, phase 2a): a view on briefs
 * `in_work`, not a separate table. Everything here is what the bc-strategy
 * order message already carries, plus what the teams made for the brief.
 */

export type OrderTab = 'open' | 'ready' | 'archive'

/**
 * `open` — the team works on it; `ready` — the team pressed «Готово»;
 * `cancelled` — the author picked from the library instead of every order;
 * `closed` — nothing left to do: the brief has left `in_work` (sent to the
 * CEO, approved…) or the author already picked what the team made.
 */
export type OrderState = 'open' | 'ready' | 'cancelled' | 'closed'

export interface OrderAnswerLine {
  label: string
  value: string
}

export interface OrderCreatedCounts {
  concepts: number
  externalNamings: number
  internalNamings: number
}

export interface OrderListItem {
  brandId: string
  brandName: string
  authorName: string
  briefStatus: BrandStatus
  state: OrderState
  /** Everything ordered when the brief was sent to the teams. */
  kinds: OrderKind[]
  /** Of those, the orders still standing (not replaced by a pick yet). */
  openKinds: OrderKind[]
  /** Of those, the orders the author replaced with something the team did not make. */
  cancelledKinds: OrderKind[]
  sentToWorkAt: string | null
  readyAt: string | null
  /** The earliest `namingDeadline` of the orders. */
  deadline: string | null
  created: OrderCreatedCounts
}

export interface OrderListResponseCounts {
  open: number
  ready: number
  archive: number
}

/** `GET /api/orders?tab=…` — the rows of one tab and how many each tab has. */
export interface OrderListResponse {
  items: OrderListItem[]
  counts: OrderListResponseCounts
}

export interface OrderSection {
  kind: OrderKind
  title: string
  /** False once the author picked — the answers leave the brief with the order. */
  open: boolean
  /** The author picked something the team did not make (event `order_cancelled`). */
  cancelled: boolean
  /** True when `answers` come from the copy kept at sending, not from the brief. */
  fromSnapshot: boolean
  answers: OrderAnswerLine[]
}

export interface OrderCreatedConcept {
  id: string
  name: string
  description: string
  authorName: string | null
  visualUrl: string | null
  status: string
  /** The author has picked it (now, or for good on approval). */
  usedInBrand: boolean
  createdAt: string
}

export interface OrderCreatedNaming {
  id: string
  name: string
  authorName: string | null
  tagline: string
  domain: string | null
  /** Domain check result of an External Naming: available / sold / unknown. */
  availability: string | null
  conceptId: string | null
  conceptName: string | null
  status: string
  usedInBrand: boolean
  createdAt: string
}

export interface OrderDetail {
  brandId: string
  brandName: string
  authorName: string
  briefStatus: BrandStatus
  state: OrderState
  sentToWorkAt: string | null
  readyAt: string | null
  readyByName: string | null
  /** When the brief left `in_work` for the CEO, and when it was approved. */
  submittedAt: string | null
  approvedAt: string | null
  geo: string | null
  launchDate: string | null
  mode: string | null
  basicsComment: string | null
  /** What the author has picked so far — the A2 message prints it too. */
  selection: {
    conceptId: string | null
    conceptName: string | null
    conceptComment: string | null
    externalNamingNames: string[]
    externalNamingComment: string | null
    internalNamingName: string | null
    internalNamingComment: string | null
  }
  sections: OrderSection[]
  created: {
    concepts: OrderCreatedConcept[]
    externalNamings: OrderCreatedNaming[]
    internalNamings: OrderCreatedNaming[]
  }
  /** Which «Створити / Додати» buttons the page may offer. */
  canAdd: Record<OrderKind, boolean>
  /** What is still missing before «Готово»; empty when it may be pressed. */
  readyBlockers: string[]
  canMarkReady: boolean
}
