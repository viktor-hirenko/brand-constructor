import { describe, it, expect } from 'vitest'
import {
  UI_ICON_BUTTON_ROOT_CLASS,
  UI_ICON_BUTTON_SIZE,
  UI_ICON_BUTTON_VARIANT,
  resolveUiIconButtonClasses,
  type UiIconButtonSize,
  type UiIconButtonVariant,
} from '@/components/ui/uiIconButton'

/**
 * `UiIconButton` class map — Figma `3333:5541` (inside section Button
 * `3333:5859`).
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const VARIANTS: UiIconButtonVariant[] = ['solid', 'glass']
const SIZES: UiIconButtonSize[] = ['S', 'L']

describe('kit icon button — Figma 3333:5541', () => {
  it('carries both kit styles and no third', () => {
    expect(Object.keys(UI_ICON_BUTTON_VARIANT).sort()).toEqual([...VARIANTS].sort())
  })

  it('carries both kit sizes and no third', () => {
    expect(Object.keys(UI_ICON_BUTTON_SIZE).sort()).toEqual([...SIZES].sort())
  })

  it('is fully round — radius/icon-button is 1000', () => {
    expect(UI_ICON_BUTTON_ROOT_CLASS).toContain('rounded-full')
  })

  describe('geometry', () => {
    it('draws L as a 48 box with 12 padding around a 24 glyph', () => {
      // 12 + 24 + 12 = 48. `get_metadata` on 3333:5580 puts the Icon instance
      // at x=12 y=12 width=24 inside a 48 symbol.
      expect(UI_ICON_BUTTON_SIZE.L.root).toContain('size-12')
      expect(UI_ICON_BUTTON_SIZE.L.root).toContain('p-3')
      expect(UI_ICON_BUTTON_SIZE.L.icon).toContain('size-6')
    })

    it('draws S as a 32 box with 8 padding around a 16 glyph, not the 40 its name claims', () => {
      // The variant is labelled "S - 40px" in Figma and drawn 32×32 in all six
      // symbols (`get_metadata` on 3333:5541 and 3333:5582: 8 + 16 + 8 = 32).
      // This test exists so nobody "fixes" the geometry to match the stale name.
      expect(UI_ICON_BUTTON_SIZE.S.root).toContain('size-8')
      expect(UI_ICON_BUTTON_SIZE.S.root).not.toContain('size-10')
      expect(UI_ICON_BUTTON_SIZE.S.root).toContain('p-2')
      expect(UI_ICON_BUTTON_SIZE.S.icon).toContain('size-4')
    })

    it('pins the box and draws the border inside it', () => {
      // Phase 1's QA caught a Secondary button rendering 50px instead of 48
      // because the height came from padding + content and a 1px border pushed
      // it out on both sides. Solid carries that same border.
      expect(UI_ICON_BUTTON_ROOT_CLASS).toContain('box-border')
    })

    it('states every length in rem-based utilities, never px', () => {
      // The wizard scales from one root font-size (`app.css` html.wizard-embed);
      // a px box silently opts out and nothing fails. See "Железные правила
      // адаптива" in docs/design-audit/dp-15258-ui-kit.md.
      const geometry = [
        UI_ICON_BUTTON_ROOT_CLASS,
        UI_ICON_BUTTON_SIZE.L.root,
        UI_ICON_BUTTON_SIZE.L.icon,
        UI_ICON_BUTTON_SIZE.S.root,
        UI_ICON_BUTTON_SIZE.S.icon,
      ].join(' ')
      expect(geometry).not.toMatch(/\[\d*\.?\d+px\]/)
    })
  })

  describe('solid — the kit reuses the Secondary button slots', () => {
    it('paints white with the ink-300 border and #393947 content', () => {
      // get_variable_defs on 3333:5541: button/secondary/bg/default #ffffff,
      // button/secondary/border #eaeaeb (= --color-ink-300 since the
      // DP-15258 token fix), button/secondary/content/default #393947
      // (= --color-ink-800).
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('bg-white')
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('border-ink-300')
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('text-ink-800')
    })

    it('never reaches for a raw #eaeaeb or the stale #ededee for that border', () => {
      // --color-ink-300 is #eaeaeb since the DP-15258 token fix; the raw-hex
      // escape hatch this used to pin is gone.
      expect(UI_ICON_BUTTON_VARIANT.solid).not.toContain('[#eaeaeb]')
      expect(UI_ICON_BUTTON_VARIANT.solid).not.toContain('#ededee')
    })

    it('hovers to #f3f3f5 — button/secondary/bg/hovered', () => {
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('hover:bg-ink-200')
    })

    it('carries the kit drop shadow and drops it when disabled', () => {
      // drop-shadow(0px 8px 4px rgba(0,0,0,0.12)) is on Default and Hovered and
      // absent on Disabled — opacity alone would leave a faded shadow behind.
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('shadow-[0_8px_4px_rgba(0,0,0,0.12)]')
      expect(UI_ICON_BUTTON_VARIANT.solid).toContain('disabled:shadow-none')
    })
  })

  describe('glass — #393947 at 25% and 50%', () => {
    it('fills with the kit alpha, not the pre-kit rgba(68,67,86,…)', () => {
      // button/glass/bg/default #39394740, hovered #39394780. The three call
      // sites this replaces all used rgba(68,67,86,0.3)/(0.5).
      expect(UI_ICON_BUTTON_VARIANT.glass).toContain('bg-[rgba(57,57,71,0.25)]')
      expect(UI_ICON_BUTTON_VARIANT.glass).toContain('hover:bg-[rgba(57,57,71,0.5)]')
      expect(UI_ICON_BUTTON_VARIANT.glass).not.toContain('68,67,86')
    })

    it('blurs the backdrop by 20, not the pre-kit 10', () => {
      expect(UI_ICON_BUTTON_VARIANT.glass).toContain('backdrop-blur-[20px]')
      expect(UI_ICON_BUTTON_VARIANT.glass).not.toContain('backdrop-blur-[10px]')
    })

    it('puts white content on the glass and carries no border', () => {
      expect(UI_ICON_BUTTON_VARIANT.glass).toContain('text-white')
      expect(UI_ICON_BUTTON_VARIANT.glass).not.toMatch(/(^|\s)border(\s|$)/)
    })
  })

  describe('disabled — opacity/50 for both styles', () => {
    it('fades to 50%, not the 30% the slider arrows used to use', () => {
      expect(UI_ICON_BUTTON_ROOT_CLASS).toContain('disabled:opacity-50')
      expect(UI_ICON_BUTTON_ROOT_CLASS).not.toContain('disabled:opacity-30')
    })

    it('applies to both styles from one place', () => {
      for (const variant of VARIANTS) {
        expect(resolveUiIconButtonClasses({ variant }).root).toContain('disabled:opacity-50')
      }
    })
  })

  describe('resolveUiIconButtonClasses', () => {
    it('defaults to Solid L — the kit default variant', () => {
      const fallback = resolveUiIconButtonClasses()
      expect(fallback).toEqual(resolveUiIconButtonClasses({ variant: 'solid', size: 'L' }))
    })

    it('composes root from the shared base, the size and the style', () => {
      const { root } = resolveUiIconButtonClasses({ variant: 'glass', size: 'S' })
      expect(root).toContain(UI_ICON_BUTTON_ROOT_CLASS)
      expect(root).toContain(UI_ICON_BUTTON_SIZE.S.root)
      expect(root).toContain(UI_ICON_BUTTON_VARIANT.glass)
    })

    it('hands back the glyph box that matches the size', () => {
      expect(resolveUiIconButtonClasses({ size: 'L' }).icon).toContain('size-6')
      expect(resolveUiIconButtonClasses({ size: 'S' }).icon).toContain('size-4')
    })

    it('covers all four style × size combinations without collision', () => {
      const roots = new Set<string>()
      for (const variant of VARIANTS) {
        for (const size of SIZES) {
          roots.add(resolveUiIconButtonClasses({ variant, size }).root)
        }
      }
      expect(roots.size).toBe(VARIANTS.length * SIZES.length)
    })
  })

  it('keeps a focus ring on every combination', () => {
    // The kit draws no focus state; three of the nine call sites this unifies
    // had one, so unifying must not quietly drop keyboard focus.
    for (const variant of VARIANTS) {
      const { root } = resolveUiIconButtonClasses({ variant })
      expect(root).toContain('focus-visible:ring-2')
      expect(root).toMatch(/focus-visible:ring-(ink-500|white\/70)/)
    }
  })
})
