import { describe, expect, it } from 'vitest'
import { ALL, distinctOptions, matchesChoice, matchesText, shownOf } from '@/utils/tableSearch'

/*
 * Search and «whose» filters of the admin's lists (owner, 07.10): 90 brands,
 * 51 concepts and 30 users could only be sorted by a column.
 */

describe('matchesText', () => {
  it('any field containing the text, any case', () => {
    expect(matchesText(['New Brand #121', 'UA'], 'brand #12')).toBe(true)
    expect(matchesText(['Olena Koval', 'olena@upstars.com'], 'UPSTARS')).toBe(true)
    expect(matchesText(['New Brand #121', null, undefined], 'wonka')).toBe(false)
  })

  it('nothing typed, or spaces, matches every row', () => {
    expect(matchesText(['x'], '')).toBe(true)
    expect(matchesText([null], '   ')).toBe(true)
  })
})

describe('distinctOptions — a filter built from the rows', () => {
  it('«all» first, then each value once, by the alphabet', () => {
    expect(distinctOptions(['Petro PO', 'Olena PO', 'Petro PO', null, ''], 'Усі автори')).toEqual([
      { value: ALL, label: 'Усі автори' },
      { value: 'Olena PO', label: 'Olena PO' },
      { value: 'Petro PO', label: 'Petro PO' },
    ])
  })

  it('a stored value is shown in words and sorted by them', () => {
    const labels: Record<string, string> = { product_owner: 'Product Owner', admin: 'Admin' }
    expect(distinctOptions(['product_owner', 'admin'], 'Усі ролі', v => labels[v]).map(o => o.label)).toEqual([
      'Усі ролі',
      'Admin',
      'Product Owner',
    ])
  })
})

describe('matchesChoice, shownOf', () => {
  it('«all» and no choice let every row through; a value — its rows only', () => {
    expect(matchesChoice('Olena PO', ALL)).toBe(true)
    expect(matchesChoice('Olena PO', null)).toBe(true)
    expect(matchesChoice('Olena PO', 'Olena PO')).toBe(true)
    expect(matchesChoice('Petro PO', 'Olena PO')).toBe(false)
    expect(matchesChoice(null, 'Olena PO')).toBe(false)
  })

  it('«12 із » only while rows are filtered out', () => {
    expect(shownOf(12, 90)).toBe('12 із ')
    expect(shownOf(90, 90)).toBe('')
  })
})
