import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { shouldClearExternalOnConceptApply } from '@/stores/constructor/useSupervisorReview'

/**
 * Owner 30.09: «Застосувати варіант CEO» in Concept silently wiped the Author's
 * External Naming (Bubbleton). The drawn state after that click
 * (`1985:2589`, `1985:2188`) keeps «Вибір замовника» next to «Вибір CEO».
 */
describe('«Застосувати варіант CEO» in Concept and the Author’s External Naming', () => {
  it('keeps the Author’s names when the CEO also proposed External Naming', () => {
    expect(shouldClearExternalOnConceptApply(['exn-ceo-1', 'exn-ceo-2'])).toBe(false)
  })

  it('still clears them when the CEO changed the concept only', () => {
    expect(shouldClearExternalOnConceptApply([])).toBe(true)
  })

  it('the store goes through the rule, not an unconditional clear', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../../../src/stores/constructor/useSupervisorReview.ts', import.meta.url)),
      'utf8',
    )
    const conceptBranch = src.slice(src.indexOf("if (section === 'concept') {"), src.indexOf("} else if (section === 'externalNaming')"))
    expect(conceptBranch).toContain('shouldClearExternalOnConceptApply(readSelectionAsArray(sel?.externalNaming))')
    expect(conceptBranch.indexOf('selectedIds = []')).toBeGreaterThan(conceptBranch.indexOf('shouldClearExternalOnConceptApply'))
  })
})
