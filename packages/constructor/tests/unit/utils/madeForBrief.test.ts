import { describe, expect, it } from 'vitest'
import { inWorkHeaderInfo, madeForBriefSummary, splitMadeForBrief } from '@/utils/madeForBrief'
import { conceptChangeDropsNamingOrder } from '@/utils/draftConceptCascade'

/**
 * Brief-orders plan, phase 2b — the author's side of an order: wait for the
 * team, then pick what it made, first in the list and without a confirmation.
 */

const BRIEF = 'brief-1'
const items = [
  { id: 'lib-a', name: 'Atlas', for_brand_id: null },
  { id: 'made-1', name: 'Sunrise', for_brand_id: BRIEF },
  { id: 'lib-b', name: 'Boreal' },
  { id: 'made-2', name: 'Lumo', for_brand_id: BRIEF },
]

describe('what the team made for the brief, in a picker list', () => {
  it('after the order was sent: made items first, the library keeps its order', () => {
    const split = splitMadeForBrief(items, { brandId: BRIEF, ordersReadyAt: '2026-10-01T10:00:00Z' })
    expect(split.made.map(i => i.id)).toEqual(['made-1', 'made-2'])
    expect(split.library.map(i => i.id)).toEqual(['lib-a', 'lib-b'])
  })

  it('before the order was sent: made items are withheld — the team may still be drawing them', () => {
    const split = splitMadeForBrief(items, { brandId: BRIEF, ordersReadyAt: null })
    expect(split.made).toEqual([])
    expect(split.library.map(i => i.id)).toEqual(['lib-a', 'lib-b'])
  })

  it('…unless already picked: a pick must not vanish from the screen', () => {
    const split = splitMadeForBrief(items, { brandId: BRIEF, ordersReadyAt: null, pickedIds: ['made-2'] })
    expect(split.library.map(i => i.id)).toEqual(['lib-a', 'lib-b', 'made-2'])
  })

  it('a brief without an id (a new draft) sees the plain library', () => {
    const split = splitMadeForBrief(items, { brandId: null, ordersReadyAt: '2026-10-01' })
    expect(split.made).toEqual([])
    expect(split.library).toHaveLength(4)
  })
})

describe('the Final review of a brief «В роботі» (owner, 02.10)', () => {
  it('while the teams work: yellow «Бриф у роботі»', () => {
    expect(inWorkHeaderInfo(null, 'Концепт «X»')).toEqual({
      title: 'Бриф у роботі',
      description: 'Команди готують замовлення.',
      iconVariant: 'warning',
    })
  })

  it('once the team sent it: blue «Замовлення виконано» naming what was made', () => {
    const summary = madeForBriefSummary({
      concepts: [{ name: 'Golden Sun' }],
      externalNamings: [{ name: 'Golden' }],
      internalNamings: [],
    })
    expect(summary).toBe('Концепт «Golden Sun», назва «Golden»')
    expect(inWorkHeaderInfo('2026-10-01T10:00:00Z', summary)).toEqual({
      title: 'Замовлення виконано',
      description: 'Концепт «Golden Sun», назва «Golden». Оберіть їх у розділах нижче та натисніть «На погодження CEO».',
      iconVariant: 'info',
    })
  })

  it('everything picked and the brief whole: the draft\'s «Бриф готовий», whatever the team did', () => {
    const ready = { title: 'Бриф готовий', description: 'Ви можете повернутись та змінити будь-який розділ перед відправкою.', iconVariant: 'check' }
    expect(inWorkHeaderInfo('2026-10-01T10:00:00Z', 'Концепт «X»', true)).toEqual(ready)
    expect(inWorkHeaderInfo(null, '', true)).toEqual(ready)
  })

  it('names in the plural and the Internal Naming', () => {
    expect(
      madeForBriefSummary({ concepts: [], externalNamings: [{ name: 'A' }, { name: 'B' }], internalNamings: [{ name: 'I' }] })
    ).toBe('Назви «A», «B», внутрішня назва «I»')
    expect(madeForBriefSummary({ concepts: [], externalNamings: [], internalNamings: [] })).toBe('')
  })
})

describe('H-07 — step 2: a name ordered for one concept does not move to another', () => {
  it('picking another concept drops the name order', () => {
    expect(
      conceptChangeDropsNamingOrder({ currentConceptId: 'farm', nextConceptId: 'luna', hasNamingOrder: true })
    ).toBe(true)
  })

  it('ordering a new concept instead drops it too', () => {
    expect(
      conceptChangeDropsNamingOrder({ currentConceptId: 'farm', nextConceptId: null, hasNamingOrder: true })
    ).toBe(true)
  })

  it('clicking the same concept again, or no name order — nothing to drop', () => {
    expect(
      conceptChangeDropsNamingOrder({ currentConceptId: 'farm', nextConceptId: 'farm', hasNamingOrder: true })
    ).toBe(false)
    expect(
      conceptChangeDropsNamingOrder({ currentConceptId: 'farm', nextConceptId: 'luna', hasNamingOrder: false })
    ).toBe(false)
  })
})
