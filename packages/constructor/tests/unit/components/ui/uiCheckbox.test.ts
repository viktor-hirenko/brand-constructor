import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  UI_CHECKBOX_BASE_CLASS,
  UI_CHECKBOX_SELECTED_CLASS,
  UI_CHECKBOX_UNSELECTED_CLASS,
  UI_CHECKBOX_ICON_CLASS,
  resolveUiCheckboxClasses,
} from '@/components/ui/uiCheckbox'

/**
 * `UiCheckbox` class map — Figma `3764:5499`, DP-15258 phase 15.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * Everything pinned below was measured off the two exported SVGs, not read off
 * the token list: 32×32, a circle (not a rounded square), a 1px #EAEAEB stroke
 * when unselected and a solid #030213 fill with a white tick when selected.
 *
 * Verified to fail: drop the border from the selected state, swap
 * `rounded-full` for `rounded-lg`, size the box `size-6`, or paint the tick
 * anything but white.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const checked = resolveUiCheckboxClasses(true)
const unchecked = resolveUiCheckboxClasses(false)

describe('kit checkbox — Figma 3764:5499, measured off the export', () => {
  it('is a 32 circle, not a rounded square', () => {
    // Both symbols export <svg width="32" height="32"> and the shape is drawn
    // as a circle; `radius/control` is 1000.
    expect(UI_CHECKBOX_BASE_CLASS).toContain('size-8')
    expect(UI_CHECKBOX_BASE_CLASS).toContain('rounded-full')
    expect(UI_CHECKBOX_BASE_CLASS).not.toContain('rounded-lg')
    expect(UI_CHECKBOX_BASE_CLASS).not.toContain('size-6')
  })

  it('keeps a border in BOTH states so the tick never shifts a pixel', () => {
    // The kit strokes Unselected and fills Selected with no stroke. Taken
    // literally that is border → no border, which moves the centred tick by a
    // pixel; Selected paints the border its own #030213 instead.
    expect(UI_CHECKBOX_BASE_CLASS).toContain('border')
    expect(UI_CHECKBOX_BASE_CLASS).toContain('box-border')
    expect(UI_CHECKBOX_SELECTED_CLASS).toContain('border-primary')
    expect(UI_CHECKBOX_UNSELECTED_CLASS).toContain('border-ink-300')
  })

  it('fills #030213 when selected and nothing when not', () => {
    expect(checked).toContain('bg-primary')
    expect(unchecked).not.toContain('bg-primary')
    expect(unchecked).not.toContain('bg-')
  })

  it('draws the tick at 16 in checkbox/icon #ffffff', () => {
    expect(UI_CHECKBOX_ICON_CLASS).toContain('size-4')
    expect(UI_CHECKBOX_ICON_CLASS).toContain('text-white')
  })

  it('has neither hover nor disabled — the kit has only two symbols', () => {
    for (const value of [checked, unchecked, UI_CHECKBOX_ICON_CLASS]) {
      expect(value).not.toContain('hover:')
      expect(value).not.toContain('disabled:')
      expect(value).not.toContain('opacity-')
    }
  })

  it('never writes a hex: the kit colours live in app.css as tokens', () => {
    for (const value of [checked, unchecked, UI_CHECKBOX_ICON_CLASS]) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
    }
  })

  it('carries no px, vw, vh or em — every length follows the embed knob', () => {
    for (const value of [checked, unchecked, UI_CHECKBOX_ICON_CLASS]) {
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      expect(value).not.toMatch(/-\[/)
    }
  })
})

describe('the component stays presentational', () => {
  const source = read('components/ui/UiCheckbox.vue')

  it('renders a span, not a control — the row around it is the button', () => {
    expect(source).toContain('aria-hidden')
    expect(source).not.toContain('<input')
    expect(source).not.toContain('<button')
    expect(source).not.toContain('@click')
  })

  it('shows the kit glyph, which phase 23 already put into CheckIcon', () => {
    // The kit's tick is Phosphor `Check`; scaling its 16-box path by 1.5 lands
    // on `icons/CheckIcon.vue` point for point.
    expect(source).toContain('CheckIcon')
    const icon = read('components/icons/CheckIcon.vue')
    expect(icon).toContain('Phosphor `Check`')
  })
})
