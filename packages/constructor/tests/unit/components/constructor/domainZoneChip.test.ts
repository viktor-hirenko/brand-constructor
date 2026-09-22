import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  DOMAIN_ZONE_CHIP_BASE_CLASS,
  DOMAIN_ZONE_CHIP_SELECTED_CLASS,
  DOMAIN_ZONE_CHIP_DEFAULT_CLASS,
  DOMAIN_ZONE_CHIP_ROW_CLASS,
  resolveDomainZoneChipClass,
} from '@/components/constructor/modals/domainZoneChip'

/**
 * Domain-zone chips — Figma `5562:49236`, DP-15258 phase 17, divergences
 * row 24.
 *
 * The kit has no component for these; the twelve raw frames on that node are
 * the whole source, and they are all drawn in one state. So the unselected
 * chip is measured (radius 8, padding 12/8, 1px #eaeaeb, caption/l 14/16
 * weight 500, gap 4) and the selected chip stays ours.
 *
 * Verified to fail: take the border back to 2px, put `gap-2` back on the row,
 * or write either hex literal back into the modals.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

describe('domain-zone chip — Figma 5562:49236, measured off the frames', () => {
  it('is radius 8 with 12 horizontal and 8 vertical padding', () => {
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toContain('rounded-lg')
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toContain('px-3')
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toContain('py-2')
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).not.toContain('py-1.5')
  })

  it('draws a hairline border in both states so the chip does not jump', () => {
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toMatch(/(^|\s)border(\s|$)/)
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).not.toContain('border-2')
    expect(DOMAIN_ZONE_CHIP_SELECTED_CLASS).not.toContain('border-2')
  })

  it('paints the unselected chip accordion/border/default #eaeaeb', () => {
    expect(DOMAIN_ZONE_CHIP_DEFAULT_CLASS).toContain('border-ink-300')
    expect(DOMAIN_ZONE_CHIP_DEFAULT_CLASS).not.toContain('border-black/10')
  })

  it("keeps the designer's #1a1a1a out — its kit value is #1f1f2e", () => {
    expect(DOMAIN_ZONE_CHIP_DEFAULT_CLASS).toContain('text-ink-900')
    for (const value of [
      resolveDomainZoneChipClass(true),
      resolveDomainZoneChipClass(false),
    ]) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
      expect(value).not.toMatch(/\brgba?\(/)
    }
  })

  it('spaces the row 4 apart, as the twelve frames are drawn', () => {
    expect(DOMAIN_ZONE_CHIP_ROW_CLASS).toContain('gap-1')
    expect(DOMAIN_ZONE_CHIP_ROW_CLASS).not.toContain('gap-2')
  })

  it('sets the label to caption/l 14/16 weight 500', () => {
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toContain('text-sm/4')
    expect(DOMAIN_ZONE_CHIP_BASE_CLASS).toContain('font-medium')
  })
})

describe('both order modals are on the map', () => {
  const concept = read('components/constructor/modals/NewConceptModal.vue')
  const naming = read('components/constructor/modals/NewNamingModal.vue')

  it('renders through the resolver instead of two copies of one recipe', () => {
    for (const source of [concept, naming]) {
      expect(source).toContain('resolveDomainZoneChipClass')
      expect(source).toContain('DOMAIN_ZONE_CHIP_ROW_CLASS')
      expect(source).not.toContain('rgba(3,2,19,0.05)')
      expect(source).not.toContain('border-black/20')
    }
  })
})
