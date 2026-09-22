import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  UI_PAGINATION_ROOT_CLASS,
  UI_PAGINATION_DOTS_CLASS,
  UI_PAGINATION_DOT_BASE_CLASS,
  UI_PAGINATION_DOT_SELECTED_CLASS,
  UI_PAGINATION_DOT_DEFAULT_CLASS,
  resolveUiPaginationClasses,
} from '@/components/ui/uiPagination'

/**
 * `UiPagination` class map — Figma `3715:5756` over `3715:5725`, DP-15258
 * phase 17.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * Every number below was measured on the kit, not copied from the plan:
 * `get_metadata` on `3715:5756` gives the pill 100×36 with its dots slot at
 * (12,12) and the five dots at x 0 / 20 / 36 / 52 / 68, and
 * `get_variable_defs` on `3715:5786` gives the four colours.
 *
 * Verified to fail: put `gap-1.5` back on the dots row, repaint the pill with
 * the pre-kit `rgba(68,67,86,0.3)`, drop the hover to `white/75`, or swap the
 * two dot sizes.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const classes = resolveUiPaginationClasses()

describe('kit pagination — Figma 3715:5756, measured off the node', () => {
  it('is a fully round pill with spacing/12 padding', () => {
    // 12 + 12 (the selected dot) + 12 = the 36 the symbol is drawn at.
    expect(UI_PAGINATION_ROOT_CLASS).toContain('rounded-full')
    expect(UI_PAGINATION_ROOT_CLASS).toContain('p-3')
  })

  it('paints pagination/bg rgba(57,57,71,0.25), not the pre-kit glass tone', () => {
    expect(UI_PAGINATION_ROOT_CLASS).toContain('bg-[rgba(57,57,71,0.25)]')
    // The last carrier of the old tone in the whole tree lived on this pill.
    expect(UI_PAGINATION_ROOT_CLASS).not.toContain('68,67,86')
  })

  it('blurs the pill 20 and each default dot 10', () => {
    expect(UI_PAGINATION_ROOT_CLASS).toContain('backdrop-blur-[20px]')
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).toContain('backdrop-blur-[10px]')
  })

  it('spaces the dots 8 apart — the kit gap, not the 6 that used to render', () => {
    // Dots at x 0 (w12), 20, 36, 52, 68 (w8) → exactly 8 between every pair.
    expect(UI_PAGINATION_DOTS_CLASS).toContain('gap-2')
    expect(UI_PAGINATION_DOTS_CLASS).not.toContain('gap-1.5')
  })

  it('draws Selected 12 white and Default 8 at half alpha', () => {
    expect(UI_PAGINATION_DOT_SELECTED_CLASS).toContain('size-3')
    expect(UI_PAGINATION_DOT_SELECTED_CLASS).toContain('bg-white')
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).toContain('size-2')
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).toContain('bg-white/50')
  })

  it('takes Hovered to full white and keeps it at 8 — the size does not change', () => {
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).toContain('hover:bg-white')
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).not.toContain('hover:bg-white/75')
    expect(UI_PAGINATION_DOT_DEFAULT_CLASS).not.toContain('hover:size-3')
  })

  it('resolves the two states off one base', () => {
    expect(classes.dot(true)).toContain(UI_PAGINATION_DOT_BASE_CLASS)
    expect(classes.dot(true)).toContain('size-3')
    expect(classes.dot(false)).toContain('size-2')
    expect(classes.dot(false)).not.toContain('size-3')
  })
})

describe('embed scale — every box follows the root font-size', () => {
  it('carries no px box, vw, vh or em; only the two blur radii stay in px', () => {
    for (const value of [classes.root, classes.dots, classes.dot(true), classes.dot(false)]) {
      const withoutBlur = value.replace(/backdrop-blur-\[\d+px\]/g, '')
      expect(withoutBlur).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
    }
  })
})

describe('the slider is on the primitive — no hand-drawn pill may come back', () => {
  const slider = read('components/constructor/preview/ConceptPreviewSlider.vue')

  it('renders UiPagination instead of its own row of dots', () => {
    expect(slider).toContain('UiPagination')
    expect(slider).not.toContain('rgba(68,67,86')
    expect(slider).not.toContain('gap-1.5')
  })
})
