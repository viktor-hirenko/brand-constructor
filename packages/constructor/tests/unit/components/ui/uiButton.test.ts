import { describe, it, expect } from 'vitest'
import {
  UI_BUTTON_KIT_DISABLED_CLASS,
  UI_BUTTON_KIT_SIZE,
  UI_BUTTON_KIT_VARIANT,
  resolveUiButtonClasses,
  type UiButtonSize,
  type UiButtonVariant,
} from '@/components/ui/uiButton'

/**
 * `UiButton` class map — Figma `3333:5860`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * Phase 10 removed the pre-kit recipe this file used to pin alongside the kit.
 * The tests that pinned it are gone with it; what replaces them is the
 * "one recipe" block below, which fails if a second branch is reintroduced.
 */

const VARIANTS: UiButtonVariant[] = ['primary', 'secondary', 'neutral', 'ghost']
const SIZES: UiButtonSize[] = ['S', 'M', 'L']

const combos = VARIANTS.flatMap(variant => SIZES.map(size => ({ variant, size })))

describe('kit geometry — Figma 3333:5860', () => {
  it('lands L on 48px: rem height, border inside the box', () => {
    expect(UI_BUTTON_KIT_SIZE.L.root).toBe('box-border h-12 p-3 text-base')
    expect(UI_BUTTON_KIT_SIZE.L.label).toBe('px-2')
    expect(UI_BUTTON_KIT_SIZE.L.icon).toBe('size-6')
  })

  it('lands M on 40px: rem height, border inside the box', () => {
    expect(UI_BUTTON_KIT_SIZE.M.root).toBe('box-border h-10 p-3 text-sm/4')
    expect(UI_BUTTON_KIT_SIZE.M.label).toBe('px-1')
    expect(UI_BUTTON_KIT_SIZE.M.icon).toBe('size-4')
  })

  it('lands S on 32px: rem height, border inside the box', () => {
    expect(UI_BUTTON_KIT_SIZE.S.root).toBe('box-border h-8 p-2 text-sm/4')
    expect(UI_BUTTON_KIT_SIZE.S.label).toBe('px-1')
    expect(UI_BUTTON_KIT_SIZE.S.icon).toBe('size-4')
  })

  it('keeps the secondary 1px border inside the kit height', () => {
    const { root } = resolveUiButtonClasses({ variant: 'secondary', size: 'L' })
    expect(root).toContain('h-12')
    expect(root).toContain('box-border')
    expect(root).toContain('border')
  })

  it('uses radius 8 via --radius-lg, not an arbitrary value', () => {
    for (const combo of combos) {
      const { root } = resolveUiButtonClasses(combo)
      expect(root).toContain('rounded-lg')
      expect(root).not.toMatch(/rounded-\[/)
    }
  })

  it('carries no gap — the kit spaces an icon with the label padding', () => {
    // `3760:2297`, the section-card header action: 128 = 12 + icon 16 +
    // label frame 88 (4 + text 80 + 4) + 12. A `gap-*` here would add a
    // fifth number the kit does not have.
    for (const combo of combos) {
      expect(resolveUiButtonClasses(combo).root).not.toContain('gap-')
    }
  })
})

describe('kit geometry follows the embed scale', () => {
  it.each(combos)('emits no px, em, vw or vh for $variant / $size', combo => {
    const classes = resolveUiButtonClasses(combo)
    const all = `${classes.root} ${classes.label} ${classes.icon}`
    expect(all).not.toMatch(/\d*\.?\d+px/)
    expect(all).not.toMatch(/(?<!r)\d*\.?\d+(em|vw|vh|dvh)\b/)
  })
})

describe('kit colour — Figma 3333:5860', () => {
  it('maps the four styles onto kit tokens', () => {
    expect(UI_BUTTON_KIT_VARIANT.primary).toBe('bg-primary text-white hover:bg-primary-hover')
    expect(UI_BUTTON_KIT_VARIANT.secondary).toBe(
      'border border-ink-300 bg-white text-ink-800 hover:bg-ink-200',
    )
    expect(UI_BUTTON_KIT_VARIANT.neutral).toBe('bg-ink-300 text-ink-900 hover:bg-ink-400')
    expect(UI_BUTTON_KIT_VARIANT.ghost).toBe('text-ink-800 hover:bg-ink-200')
  })

  it('writes no colour literal — every tone comes from a @theme token', () => {
    for (const variant of VARIANTS) {
      expect(UI_BUTTON_KIT_VARIANT[variant]).not.toMatch(/#[0-9a-fA-F]{3,8}/)
      expect(UI_BUTTON_KIT_VARIANT[variant]).not.toMatch(/black\/|white\//)
    }
  })

  it('dims disabled to the kit opacity/50 in every style', () => {
    expect(UI_BUTTON_KIT_DISABLED_CLASS).toBe('disabled:cursor-not-allowed disabled:opacity-50')
    for (const combo of combos) {
      expect(resolveUiButtonClasses(combo).root).toContain('disabled:opacity-50')
    }
  })

  it('gives secondary the only border in the matrix', () => {
    const bordered = VARIANTS.filter(variant => UI_BUTTON_KIT_VARIANT[variant].includes('border'))
    expect(bordered).toEqual(['secondary'])
  })
})

describe('one recipe — phase 10 retired the pre-kit branch', () => {
  it('answers an unqualified call with the kit primary L, not a legacy string', () => {
    expect(resolveUiButtonClasses()).toEqual({
      root:
        'ui-button inline-flex items-center justify-center rounded-lg font-medium transition-colors ' +
        'box-border h-12 p-3 text-base bg-primary text-white hover:bg-primary-hover ' +
        'disabled:cursor-not-allowed disabled:opacity-50',
      label: 'px-2',
      icon: 'size-6',
    })
  })

  it('has no option left that could route to a second look', () => {
    // The `kit` and `hasIcon` options are gone. Passing them is a type error,
    // and at runtime they must change nothing — otherwise a call site could
    // still be silently rendering something the kit does not draw.
    const extra = { kit: false, hasIcon: true } as Record<string, unknown>
    expect(resolveUiButtonClasses({ variant: 'ghost', size: 'M', ...extra })).toEqual(
      resolveUiButtonClasses({ variant: 'ghost', size: 'M' }),
    )
  })

  it('drops tracking in every size — the kit letter-spacing is 0', () => {
    // Open question 7 keeps tracking on carry-over *text*; the button lost it
    // in phase 1 and the screens that phase 10 converts join that decision.
    for (const size of SIZES) {
      expect(UI_BUTTON_KIT_SIZE[size].root).not.toContain('tracking-')
    }
    for (const combo of combos) {
      const classes = resolveUiButtonClasses(combo)
      expect(`${classes.root} ${classes.label}`).not.toContain('tracking-')
    }
  })
})

describe('block', () => {
  it('stretches with flex-1', () => {
    expect(resolveUiButtonClasses({ block: true }).root).toContain('flex-1')
  })

  it('is off unless asked for', () => {
    expect(resolveUiButtonClasses({}).root).not.toContain('flex-1')
  })
})

describe('BEM hook', () => {
  it('keeps the ui-button class an embedder may target', () => {
    for (const combo of combos) {
      expect(resolveUiButtonClasses(combo).root.startsWith('ui-button ')).toBe(true)
    }
  })
})
