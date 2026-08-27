import { describe, expect, it } from 'vitest'
import {
  buildDisplayVariants,
  findVariantConflicts,
  typeHasConflict,
  variantIncompatibilityCaption,
  variantLetter,
  type CompatibilityContext,
} from '@/utils/visualComponentVariants'

/**
 * Production rows, read from D1 on 2026-08-27:
 *
 *   ct_header  Type 1 → variant_number 5   ct_tabbar  Type 1 → variant_number 5
 *   ct_header  Type 2 → variant_number 2   ct_tabbar  Type 2 → variant_number 6
 *   ct_header  Type 3 → variant_number 3   ct_tabbar  Type 3 → variant_number 4
 *   ct_header  Type 4 → variant_number 6
 *
 * The numbers are deliberately kept in these fixtures: the rule used to key on
 * `variant_number`, and Tabbar "Type 2" carrying 6 is exactly why it stopped
 * firing. The letters below come from display order, so the fixtures stay true
 * to production while the rule matches what the mockup states.
 */
const HEADER_VARIANTS = [
  { id: 'cvr_header_1', name: 'Type 1', variant_number: 5 },
  { id: 'cvr_header_2', name: 'Type 2', variant_number: 2 },
  { id: 'cvr_header_3', name: 'Type 3', variant_number: 3 },
  { id: 'cvr_header_4', name: 'Type 4', variant_number: 6 },
]

const TABBAR_VARIANTS = [
  { id: 'cvr_tabbar_1', name: 'Type 1', variant_number: 5 },
  { id: 'cvr_tabbar_2', name: 'Type 2', variant_number: 6 },
  { id: 'cvr_tabbar_3', name: 'Type 3', variant_number: 4 },
]

function createContext(selections: Record<string, string> = {}): CompatibilityContext {
  return {
    displayByType: {
      ct_header: buildDisplayVariants(HEADER_VARIANTS),
      ct_tabbar: buildDisplayVariants(TABBAR_VARIANTS),
    },
    selections,
    typeNames: { ct_header: 'Header', ct_tabbar: 'Tabbar' },
  }
}

/** Header Type C and Tabbar Type B — the pair the design calls incompatible. */
const CONFLICTING_SELECTION = { ct_header: 'cvr_header_3', ct_tabbar: 'cvr_tabbar_2' }

describe('variantLetter', () => {
  it('numbers positions from A', () => {
    expect(variantLetter(0)).toBe('A')
    expect(variantLetter(2)).toBe('C')
    expect(variantLetter(25)).toBe('Z')
  })

  it('falls back to the plain position past Z', () => {
    expect(variantLetter(26)).toBe('27')
  })
})

describe('buildDisplayVariants', () => {
  it('labels by display order, not by variant_number', () => {
    expect(buildDisplayVariants(HEADER_VARIANTS)).toEqual([
      { id: 'cvr_header_1', letter: 'A', label: 'Type A' },
      { id: 'cvr_header_2', letter: 'B', label: 'Type B' },
      { id: 'cvr_header_3', letter: 'C', label: 'Type C' },
      { id: 'cvr_header_4', letter: 'D', label: 'Type D' },
    ])
  })
})

describe('findVariantConflicts', () => {
  it('reports Header Type C together with Tabbar Type B', () => {
    const conflicts = findVariantConflicts(createContext(CONFLICTING_SELECTION))

    expect(conflicts).toEqual([
      {
        typeIdA: 'ct_header',
        variantIdA: 'cvr_header_3',
        titleA: 'Header Type C',
        typeIdB: 'ct_tabbar',
        variantIdB: 'cvr_tabbar_2',
        titleB: 'Tabbar Type B',
      },
    ])
  })

  it('stays silent for every other combination of the same two types', () => {
    const combinations = HEADER_VARIANTS.flatMap(header =>
      TABBAR_VARIANTS.map(tabbar => ({ ct_header: header.id, ct_tabbar: tabbar.id }))
    ).filter(
      selection =>
        selection.ct_header !== CONFLICTING_SELECTION.ct_header ||
        selection.ct_tabbar !== CONFLICTING_SELECTION.ct_tabbar
    )

    expect(combinations).toHaveLength(11)
    for (const selection of combinations) {
      expect(findVariantConflicts(createContext(selection))).toEqual([])
    }
  })

  it('needs both sides selected', () => {
    expect(findVariantConflicts(createContext({ ct_header: 'cvr_header_3' }))).toEqual([])
    expect(findVariantConflicts(createContext({ ct_tabbar: 'cvr_tabbar_2' }))).toEqual([])
  })

  it('ignores a selection whose variant is not in the loaded list', () => {
    expect(
      findVariantConflicts(
        createContext({ ct_header: 'cvr_header_gone', ct_tabbar: 'cvr_tabbar_2' })
      )
    ).toEqual([])
  })
})

describe('typeHasConflict', () => {
  it('marks both sides of the pair and nothing else', () => {
    const conflicts = findVariantConflicts(createContext(CONFLICTING_SELECTION))

    expect(typeHasConflict(conflicts, 'ct_header')).toBe(true)
    expect(typeHasConflict(conflicts, 'ct_tabbar')).toBe(true)
    expect(typeHasConflict(conflicts, 'ct_banners')).toBe(false)
  })
})

describe('variantIncompatibilityCaption', () => {
  it('names the selected counterpart on the conflicting row', () => {
    const ctx = createContext({ ct_header: 'cvr_header_3' })

    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_2')).toBe(
      'Несумісний з обраним Header Type C'
    )
  })

  it('works in the other direction too', () => {
    const ctx = createContext({ ct_tabbar: 'cvr_tabbar_2' })

    expect(variantIncompatibilityCaption(ctx, 'ct_header', 'cvr_header_3')).toBe(
      'Несумісний з обраним Tabbar Type B'
    )
  })

  it('shows on a row that is not selected yet', () => {
    const ctx = createContext({ ct_header: 'cvr_header_3', ct_tabbar: 'cvr_tabbar_1' })

    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_2')).toBe(
      'Несумісний з обраним Header Type C'
    )
  })

  it('is absent on rows the rule does not mention', () => {
    const ctx = createContext({ ct_header: 'cvr_header_3' })

    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_1')).toBeNull()
    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_3')).toBeNull()
  })

  it('is absent while the counterpart type has no selection', () => {
    const ctx = createContext({})

    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_2')).toBeNull()
  })

  it('is absent when the counterpart selection is a different variant', () => {
    const ctx = createContext({ ct_header: 'cvr_header_4' })

    expect(variantIncompatibilityCaption(ctx, 'ct_tabbar', 'cvr_tabbar_2')).toBeNull()
  })
})
