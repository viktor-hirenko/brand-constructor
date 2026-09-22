import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_BASE_CLASS,
  UI_NAME_CARD_DEFAULT_CLASS,
  UI_NAME_CARD_HOVER_CLASS,
  UI_NAME_CARD_SELECTED_CLASS,
  UI_NAME_CARD_DISABLED_CLASS,
  UI_NAME_CARD_NAME_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  resolveUiNameCardClasses,
} from '@/components/ui/uiNameCard'

/**
 * `UiNameCard` class map — Figma `3719:5978`, DP-15258 phase 15 (redesign of
 * step 4; step 3 follows in phase 16 on the same primitive).
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * The numbers were measured on two canvases and on the three exported symbols,
 * not copied from the plan. The card is **64** tall on step 4, not the 76 of
 * the kit frame: 76 includes the domain line, which step 4 hides, leaving the
 * 32 checkbox plus 16 of padding on each side.
 *
 * Verified to fail: give the card `h-[128px]` back, let the selected state
 * hover, swap the inset ring for a border (the 1px → 2px jump the ring exists
 * to avoid), put the tile grid's auto-fill formula back, or let the skeleton's
 * bar height drift away from the name's line box.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const plain = resolveUiNameCardClasses()
const selected = resolveUiNameCardClasses({ selected: true })
const disabled = resolveUiNameCardClasses({ disabled: true })

const ALL = [
  UI_NAME_CARD_GRID_CLASS,
  plain,
  selected,
  disabled,
  UI_NAME_CARD_NAME_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
]

describe('kit name card — Figma 3719:5978, measured on the drawn screens', () => {
  it('is a 64 row, not the 76 of the kit frame and not the old 128 tile', () => {
    // `4071:7776` and `5387:105124`: checkbox 32 at y=16 → 16 + 32 + 16 = 64.
    expect(UI_NAME_CARD_BASE_CLASS).toContain('h-16')
    expect(UI_NAME_CARD_BASE_CLASS).not.toContain('h-[128px]')
    expect(UI_NAME_CARD_BASE_CLASS).not.toContain('h-19')
  })

  it('pads 16 and gaps 16, with radius/concept-card 16 on a white fill', () => {
    // checkbox at x=16, text frame at x=64 → 16 + 32 + 16.
    expect(UI_NAME_CARD_BASE_CLASS).toContain('px-4')
    expect(UI_NAME_CARD_BASE_CLASS).toContain('gap-4')
    expect(UI_NAME_CARD_BASE_CLASS).toContain('rounded-2xl')
    expect(UI_NAME_CARD_BASE_CLASS).toContain('bg-white')
    expect(UI_NAME_CARD_BASE_CLASS).not.toContain('rounded-[16px]')
  })

  it('lays the name out on the left, one 20/24 line', () => {
    // `header/m` 20/24 weight 500 in `name card/content/primary` #1f1f2e.
    // Bare `text-xl` is Tailwind's 20/28 — the `/6` is the kit's line height.
    expect(UI_NAME_CARD_NAME_CLASS).toContain('text-xl/6')
    expect(UI_NAME_CARD_NAME_CLASS).toContain('font-medium')
    expect(UI_NAME_CARD_NAME_CLASS).toContain('text-ink-900')
    expect(UI_NAME_CARD_BASE_CLASS).toContain('text-left')
    // The tile centred its name and painted it #1a1a1a, a colour the kit does
    // not contain (divergence row 17).
    expect(UI_NAME_CARD_NAME_CLASS).not.toContain('text-center')
    expect(UI_NAME_CARD_NAME_CLASS).not.toContain('1a1a1a')
  })

  it('draws 1px on default and hovered and 2px on selected', () => {
    // Exports: stroke #EAEAEB / #6F6F7D at 1, stroke #030213 stroke-width="2".
    expect(UI_NAME_CARD_DEFAULT_CLASS).toContain('inset-ring-1')
    expect(UI_NAME_CARD_DEFAULT_CLASS).toContain('inset-ring-ink-300')
    expect(UI_NAME_CARD_HOVER_CLASS).toBe('hover:inset-ring-ink-700')
    expect(UI_NAME_CARD_SELECTED_CLASS).toContain('inset-ring-2')
    expect(UI_NAME_CARD_SELECTED_CLASS).toContain('inset-ring-primary')
  })

  it('uses an inset ring rather than a border, so picking a name moves nothing', () => {
    // Figma strokes inside: the checkbox sits at (16, 22) in Default AND in
    // Selected. A CSS border going 1 → 2 would shift the row's content by 1px.
    for (const value of [plain, selected]) {
      expect(value).not.toMatch(/\bborder\b/)
      expect(value).not.toMatch(/\bborder-2\b/)
    }
  })

  it('does not hover once it is selected — the kit states are exclusive', () => {
    expect(plain).toContain('hover:inset-ring-ink-700')
    expect(selected).not.toContain('hover:')
    expect(selected).not.toContain('inset-ring-1')
  })

  it('disables with the kit opacity/50, not the tile grid opacity-40', () => {
    expect(disabled).toContain('opacity-50')
    expect(disabled).toContain('cursor-not-allowed')
    expect(disabled).not.toContain('opacity-40')
    expect(disabled).not.toContain('hover:')
  })

  it('never writes a hex: the kit colours live in app.css as tokens', () => {
    for (const value of ALL) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
    }
  })

  it('drops the tracking — this is a redesign screen and the kit sets zero', () => {
    for (const value of ALL) {
      expect(value).not.toContain('tracking-')
    }
  })
})

describe('the grid: two fixed columns, gap 8, shared with the skeleton', () => {
  it('fixes the column count the mockup fixes', () => {
    // `4071:7486`: cards at x 0 and 254 of a 500 container; `5387:104658`:
    // x 0 and 267.5 of 527. Two columns on both canvases.
    expect(UI_NAME_CARD_GRID_CLASS).toContain('repeat(2,minmax(0,1fr))')
    expect(UI_NAME_CARD_GRID_CLASS).toContain('gap-2')
    // The tile grids' density handle does not apply to a row card: at our real
    // container widths auto-fill lands on 1 or 3, never 2.
    expect(UI_NAME_CARD_GRID_CLASS).not.toContain('auto-fill')
    expect(UI_NAME_CARD_GRID_CLASS).not.toContain('9rem')
  })

  it('still cannot overflow a narrow container', () => {
    // This is the half of the named invariant that survives: `minmax(0,1fr)`
    // never grows past its track, and the card truncates instead.
    expect(UI_NAME_CARD_GRID_CLASS).toContain('minmax(0,1fr)')
    expect(UI_NAME_CARD_NAME_CLASS).toContain('min-w-0')
    expect(UI_NAME_CARD_NAME_CLASS).toContain('truncate')
  })

  it('hands the skeleton the same 24 the name line box is', () => {
    // `text-xl/6` IS 24 of line box; the grey bar has none, so the number
    // travels as its own constant and this test pins the pair.
    expect(UI_NAME_CARD_NAME_CLASS).toContain('text-xl/6')
    expect(UI_NAME_CARD_NAME_HEIGHT_CLASS).toBe('h-6')
  })
})

describe('embed scale — every length follows the root font-size', () => {
  it('carries no px, vw, vh or em length anywhere', () => {
    for (const value of ALL) {
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
    }
  })
})

describe('step 4 is on the primitive — the tile recipe may not come back', () => {
  const grid = read('components/constructor/alternative-selection/InternalNamingGrid.vue')
  const skeleton = read('components/constructor/skeletons/InternalNamingGridSkeleton.vue')

  it('the grid renders UiNameCard instead of hand-drawn tiles', () => {
    expect(grid).toContain('UiNameCard')
    expect(grid).toContain('UI_NAME_CARD_GRID_CLASS')
    expect(grid).not.toContain('h-[128px]')
    expect(grid).not.toContain('rounded-[100px]')
    expect(grid).not.toContain('#1a1a1a')
    expect(grid).not.toContain('CheckIcon')
  })

  it('the skeleton imports the geometry instead of copying it', () => {
    expect(skeleton).toContain('UI_NAME_CARD_GRID_CLASS')
    expect(skeleton).toContain('UI_NAME_CARD_BASE_CLASS')
    expect(skeleton).toContain('UI_NAME_CARD_NAME_HEIGHT_CLASS')
    expect(skeleton).not.toContain('h-[128px]')
    expect(skeleton).not.toContain('9rem')
    expect(skeleton).not.toMatch(/max-w-\[\d+px\]/)
  })

  it('single selection still leaves this component — the store owns it', () => {
    // The redesign is markup only: the props and the event are the contract all
    // four call sites depend on, and a broken selection looks fine on screen.
    expect(grid).toContain('selectedId')
    expect(grid).toContain("select: [namingId: string]")
    expect(grid).toContain("emit('select', naming.id)")
  })
})
