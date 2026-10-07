import { describe, expect, it } from 'vitest'
import { filterOptions, moveHighlight, selectedLabel } from '@/utils/searchSelect'

/*
 * Picking a concept by typing (owner, 07.10). The concept field of a naming
 * was a plain list: with fifty concepts one scrolled it looking for «Wonka».
 */

const options = [
  { value: null, label: '— Без концепту —' },
  { value: 'cpt_wonka', label: 'Wonka' },
  { value: 'cpt_wonderland', label: 'Wonderland' },
  { value: 'cpt_gold', label: 'Gold Rush Saloon' },
]
const labels = (list: { label: string }[]) => list.map(o => o.label)

describe('filterOptions', () => {
  it('what is typed leaves the options that contain it, any case', () => {
    expect(labels(filterOptions(options, 'won'))).toEqual(['Wonka', 'Wonderland'])
    expect(labels(filterOptions(options, 'RUSH'))).toEqual(['Gold Rush Saloon'])
  })

  it('nothing typed, or only spaces, keeps every option in its order', () => {
    expect(filterOptions(options, '')).toEqual(options)
    expect(filterOptions(options, '   ')).toEqual(options)
  })

  it('no match is an empty list, not the full one', () => {
    expect(filterOptions(options, 'zzz')).toEqual([])
  })

  it('«без концепту» is found by its words too', () => {
    expect(labels(filterOptions(options, 'без'))).toEqual(['— Без концепту —'])
  })
})

describe('moveHighlight — the arrow keys', () => {
  it('goes down and up and wraps round the ends', () => {
    expect(moveHighlight(0, 1, 3)).toBe(1)
    expect(moveHighlight(2, 1, 3)).toBe(0)
    expect(moveHighlight(0, -1, 3)).toBe(2)
  })

  it('from nothing highlighted: down — the first, up — the last; an empty list has no row', () => {
    expect(moveHighlight(-1, 1, 3)).toBe(0)
    expect(moveHighlight(-1, -1, 3)).toBe(2)
    expect(moveHighlight(0, 1, 0)).toBe(-1)
  })
})

describe('selectedLabel — what the closed field shows', () => {
  it('the label of the value, the «no concept» one for null, nothing for a value that is gone', () => {
    expect(selectedLabel(options, 'cpt_wonka')).toBe('Wonka')
    expect(selectedLabel(options, null)).toBe('— Без концепту —')
    expect(selectedLabel(options, 'cpt_deleted')).toBe('')
  })
})
