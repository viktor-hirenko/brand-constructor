import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brandSearchValues, conceptPick, internalNamingPick, pickSortValue, pickText } from '@/utils/brandPicks'
import { matchesText } from '@/utils/tableSearch'

/*
 * The Brands table said «New Brand #122» and nothing about which brand it is;
 * the brief had to be opened to learn it (owner, 07.10). Now: the concept and
 * the Internal Naming beside the number, «замовлено» while the team has not
 * made the ordered one, and a search by any of the brief's names.
 */

const brief = (over: Record<string, unknown> = {}) =>
  ({
    internalName: 'New Brand #122',
    conceptName: null,
    internalNamingName: null,
    externalNamingNames: [],
    newConceptBrief: null,
    stepData: null,
    ...over,
  }) as Parameters<typeof conceptPick>[0]

describe('the concept of a brief', () => {
  it('picked from the library: its name', () => {
    expect(pickText(conceptPick(brief({ conceptName: 'Golden Frontier' })))).toBe('Golden Frontier')
  })

  it('ordered and not made yet: «замовлено»', () => {
    expect(pickText(conceptPick(brief({ newConceptBrief: { geoInfo: 'AU' } })))).toBe('замовлено')
  })

  it('the team made it and the author picked it: the name, though the order is still on the brief', () => {
    const made = brief({ conceptName: 'Gold Rush Saloon', newConceptBrief: { geoInfo: 'AU' } })
    expect(conceptPick(made)).toEqual({ kind: 'picked', name: 'Gold Rush Saloon' })
  })

  it('nothing yet: a dash', () => {
    expect(pickText(conceptPick(brief()))).toBe('—')
  })
})

describe('the Internal Naming of a brief', () => {
  it('picked: its name', () => {
    expect(pickText(internalNamingPick(brief({ internalNamingName: 'Thor' })))).toBe('Thor')
  })

  it('a wish typed on the step is an order', () => {
    const ordered = brief({ stepData: { internalNaming: { selectedId: null, comment: '', newNamingFeedback: 'Short, Nordic' } } })
    expect(pickText(internalNamingPick(ordered))).toBe('замовлено')
  })

  it('an empty wish is not an order', () => {
    const blank = brief({ stepData: { internalNaming: { selectedId: null, comment: '', newNamingFeedback: '  ' } } })
    expect(pickText(internalNamingPick(blank))).toBe('—')
  })
})

describe('search and sort', () => {
  const golden = brief({
    conceptName: 'Golden Frontier',
    internalNamingName: 'Thor',
    externalNamingNames: ['Frontiera', 'Goldfront'],
  })

  it.each(['#122', 'golden', 'thor', 'goldfront'])('«%s» finds the brief', text => {
    expect(matchesText(brandSearchValues(golden), text)).toBe(true)
  })

  it('a name of another brand does not', () => {
    expect(matchesText(brandSearchValues(golden), 'sunrise')).toBe(false)
  })

  it('names sort before orders and empty cells', () => {
    const cells = [conceptPick(brief()), conceptPick(brief({ conceptName: 'Wonka' })), conceptPick(brief({ conceptName: 'alpa' }))]
    expect(cells.sort((a, b) => pickSortValue(a).localeCompare(pickSortValue(b))).map(pickText)).toEqual(['alpa', 'Wonka', '—'])
  })
})

describe('the Brands table', () => {
  const view = readFileSync(resolve(__dirname, '../../../src/views/BrandsView.vue'), 'utf8')
  const heads = [...view.slice(view.indexOf('<thead>'), view.indexOf('</thead>')).matchAll(/<th(?:\s[^>]*)?>\s*([^<{\n]+)/g)].map(m => m[1].trim())

  it('«Концепт» and «Internal Naming» stand right after «Назва», before the status', () => {
    expect(heads.slice(0, 4)).toEqual(['Назва', 'Концепт', 'Internal Naming', 'Статус'])
  })

  it('External Namings get no column', () => {
    expect(heads).not.toContain('External Naming')
  })

  it('the search looks through every name of the brief', () => {
    expect(view).toMatch(/matchesText\(brandSearchValues\(brand\), searchQuery\.value\)/)
  })
})
