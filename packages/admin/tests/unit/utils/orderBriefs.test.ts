import { describe, expect, it } from 'vitest'
import type { OrderListItem } from '@brand-constructor/shared'
import { briefsForKind, forBriefLabel } from '@/utils/orderBriefs'
import { createdSummary, availabilityLabel, ORDER_STATE_BADGES, orderBadge, orderedSummary, orderSectionBadge, orderStatusNote } from '@/utils/orderDisplay'

/*
 * «For brief» on the library pages and the words of the Orders pages
 * (brief-orders plan, phase 2a). The worker decides; this keeps the choice
 * list to briefs that can still take an item of that kind.
 */

function order(partial: Partial<OrderListItem>): OrderListItem {
  return {
    brandId: 'b',
    brandName: 'New Brand #1',
    authorName: 'PO',
    briefStatus: 'in_work',
    state: 'open',
    kinds: [],
    openKinds: [],
    cancelledKinds: [],
    sentToWorkAt: null,
    readyAt: null,
    deadline: null,
    created: { concepts: 0, externalNamings: 0, internalNamings: 0 },
    ...partial,
  }
}

describe('briefsForKind', () => {
  const concept = order({ brandId: 'c', kinds: ['concept'], openKinds: ['concept'] })
  const naming = order({ brandId: 'n', kinds: ['externalNaming'], openKinds: ['externalNaming'] })
  const internal = order({ brandId: 'i', kinds: ['internalNaming'], openKinds: ['internalNaming'] })
  const cancelled = order({ brandId: 'x', state: 'cancelled', kinds: ['concept'], openKinds: [] })
  const closed = order({ brandId: 'z', state: 'closed', kinds: ['concept'], openKinds: ['concept'] })
  const ready = order({ brandId: 'r', state: 'ready', kinds: ['concept'], openKinds: ['concept'] })
  const all = [concept, naming, internal, cancelled, closed, ready]
  const ids = (kind: Parameters<typeof briefsForKind>[1]) => briefsForKind(all, kind).map(o => o.brandId)

  it('a concept only for a standing concept order', () => {
    expect(ids('concept')).toEqual(['c', 'r'])
  })

  it('an external name for a naming order or for a new concept', () => {
    expect(ids('external')).toEqual(['c', 'n', 'r'])
  })

  it('an internal name only for an Internal Naming order', () => {
    expect(ids('internal')).toEqual(['i'])
  })
})

describe('the words', () => {
  it('names the brief a library item was made for', () => {
    expect(forBriefLabel({ for_brand_id: 'b', for_brand_name: 'New Brand #7' })).toBe('For New Brand #7')
    expect(forBriefLabel({ for_brand_id: null })).toBeNull()
  })

  it('sums up what was made', () => {
    expect(createdSummary({ concepts: 1, externalNamings: 3, internalNamings: 0 })).toBe('1 concept · 3 names')
    expect(createdSummary({ concepts: 0, externalNamings: 0, internalNamings: 0 })).toBe('—')
  })

  it('has a badge for every state', () => {
    expect(Object.keys(ORDER_STATE_BADGES).sort()).toEqual(['cancelled', 'closed', 'open', 'ready'])
  })
})

describe('order page statuses (owner, 01.10: «пішов далі» said nothing)', () => {
  const base = { readyAt: null, readyByName: null, submittedAt: '2026-10-01T16:11:00Z', approvedAt: null }

  it('names where the brief is once the team is done', () => {
    expect(orderStatusNote({ ...base, state: 'closed', briefStatus: 'submitted' })).toMatch(/^Бриф на погодженні в CEO з /)
    expect(orderStatusNote({ ...base, state: 'closed', briefStatus: 'needs_revision' })).toBe(
      'CEO повернув бриф замовнику на доопрацювання.'
    )
    expect(orderStatusNote({ ...base, state: 'closed', briefStatus: 'in_work' })).toBe(
      'Замовник обрав створене. Робити нічого не треба.'
    )
    expect(orderStatusNote({ ...base, state: 'open', briefStatus: 'in_work' })).toBeNull()
  })

  it('a sent order says only that it was sent — no «чекаємо» (owner, 02.10)', () => {
    expect(
      orderStatusNote({ ...base, state: 'ready', briefStatus: 'in_work', readyAt: '2026-10-01T10:00:00Z', readyByName: 'Viktor Hirenko' })
    ).toMatch(/^Відправлено замовнику \(Viktor Hirenko, .+\)\.$/)
  })

  it('the plate follows the brief once the order is closed', () => {
    expect(orderBadge('closed', 'submitted').label).toBe('На погодженні в CEO')
    expect(orderBadge('closed', 'approved').label).toBe('Затверджено')
    expect(orderBadge('closed', 'in_work').label).toBe('Обрано замовником')
    expect(orderBadge('ready', 'in_work').label).toBe('Чекає на замовника')
    expect(orderBadge('open', 'in_work').label).toBe('В роботі')
  })

  it('«Чекає на замовника» is amber like «На доопрацюванні», not the purple of «В роботі»', () => {
    expect(orderBadge('ready', 'in_work').cls).toBe('badge--amber')
    expect(orderBadge('closed', 'needs_revision').cls).toBe('badge--amber')
    expect(orderBadge('open', 'in_work').cls).toBe('badge--purple')
  })

  it('a closed section says whether it was done or cancelled', () => {
    expect(orderSectionBadge({ open: true, cancelled: false })).toBeNull()
    expect(orderSectionBadge({ open: false, cancelled: false })).toBeNull()
    expect(orderSectionBadge({ open: false, cancelled: true })?.label).toBe('Скасовано')
  })
})

describe('order page words (owner, 01.10)', () => {
  it('says what was ordered', () => {
    expect(orderedSummary(['concept'])).toBe('новий концепт')
    expect(orderedSummary(['concept', 'internalNaming'])).toBe('новий концепт і новий Internal Naming')
    // bug 3 of the full run 06.10: the header uses the Orders list's words
    expect(orderedSummary(['externalNaming'])).toBe('новий External Naming')
    expect(orderedSummary(['internalNaming'])).toBe('новий Internal Naming')
  })

  it('names the domain check as the Namings table does', () => {
    expect(availabilityLabel('available')).toBe('✓ Available')
    expect(availabilityLabel('sold')).toBe('✗ Sold')
    expect(availabilityLabel(null)).toBe('? Unknown')
  })
})
