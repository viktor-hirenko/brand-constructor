import { describe, it, expect } from 'vitest'
import {
  UI_BUTTON_KIT_DISABLED_CLASS,
  UI_BUTTON_KIT_SIZE,
  UI_BUTTON_KIT_VARIANT,
  UI_BUTTON_LEGACY_BASE_CLASS,
  UI_BUTTON_LEGACY_VARIANT,
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
    const { root } = resolveUiButtonClasses({ variant: 'secondary', size: 'L', kit: true })
    expect(root).toContain('h-12')
    expect(root).toContain('box-border')
    expect(root).toContain('border')
  })

  it('uses radius 8 via --radius-lg, not an arbitrary value', () => {
    for (const combo of combos) {
      const { root } = resolveUiButtonClasses({ ...combo, kit: true })
      expect(root).toContain('rounded-lg')
      expect(root).not.toMatch(/rounded-\[/)
    }
  })
})

describe('kit geometry follows the embed scale', () => {
  it.each(combos)('emits no px, em, vw or vh for $variant / $size', combo => {
    const classes = resolveUiButtonClasses({ ...combo, kit: true })
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
      expect(resolveUiButtonClasses({ ...combo, kit: true }).root).toContain('disabled:opacity-50')
    }
  })

  it('gives secondary the only border in the matrix', () => {
    const bordered = VARIANTS.filter(variant => UI_BUTTON_KIT_VARIANT[variant].includes('border'))
    expect(bordered).toEqual(['secondary'])
  })
})

describe('pre-kit recipe stays byte for byte what it shipped', () => {
  // Pinned so that bringing the kit in cannot restyle ConfirmationModal,
  // BriefModalShell, MarketingPackageView or VisualComponentsView by accident.
  // These four move to the kit recipe in phases 4, 6 and 10.
  it('is what an unqualified call returns', () => {
    expect(resolveUiButtonClasses()).toEqual({
      root: `${UI_BUTTON_LEGACY_BASE_CLASS} ${UI_BUTTON_LEGACY_VARIANT.primary}`,
      label: '',
      icon: 'size-4',
    })
  })

  it('renders the primary string the modals rely on', () => {
    expect(resolveUiButtonClasses({ variant: 'primary', block: true }).root).toBe(
      'ui-button inline-flex items-center justify-center rounded-[8px] p-3 text-[1rem] font-medium leading-6 tracking-[-0.3125px] flex-1 ' +
        'bg-[#030213] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
    )
  })

  it('renders the secondary string the modals rely on', () => {
    expect(resolveUiButtonClasses({ variant: 'secondary', block: true }).root).toBe(
      'ui-button inline-flex items-center justify-center rounded-[8px] p-3 text-[1rem] font-medium leading-6 tracking-[-0.3125px] flex-1 ' +
        'border border-black/10 bg-white text-[#0a0a0a] transition-colors hover:bg-black/[0.02] disabled:opacity-40',
    )
  })

  it('keeps its tracking, unlike the kit — open question 7', () => {
    expect(UI_BUTTON_LEGACY_BASE_CLASS).toContain('tracking-[-0.3125px]')
    for (const size of SIZES) {
      expect(UI_BUTTON_KIT_SIZE[size].root).not.toContain('tracking-')
    }
  })

  it('adds a gap for an icon, since it has no label padding to space one', () => {
    expect(resolveUiButtonClasses({ hasIcon: true }).root).toContain('gap-2')
    expect(resolveUiButtonClasses({ hasIcon: false }).root).not.toContain('gap-')
  })

  it('needs no gap in the kit recipe — the label pads itself', () => {
    for (const size of SIZES) {
      expect(resolveUiButtonClasses({ size, kit: true, hasIcon: true }).root).not.toContain('gap-')
    }
  })
})

describe('block', () => {
  it('stretches with flex-1 in both recipes', () => {
    expect(resolveUiButtonClasses({ block: true }).root).toContain('flex-1')
    expect(resolveUiButtonClasses({ block: true, kit: true }).root).toContain('flex-1')
  })

  it('is off unless asked for', () => {
    expect(resolveUiButtonClasses({}).root).not.toContain('flex-1')
    expect(resolveUiButtonClasses({ kit: true }).root).not.toContain('flex-1')
  })
})

describe('BEM hook', () => {
  it('keeps the ui-button class an embedder may target', () => {
    for (const combo of combos) {
      expect(resolveUiButtonClasses({ ...combo, kit: true }).root.startsWith('ui-button ')).toBe(true)
      expect(resolveUiButtonClasses(combo).root.startsWith('ui-button ')).toBe(true)
    }
  })
})
