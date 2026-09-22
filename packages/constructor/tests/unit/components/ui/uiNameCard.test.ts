import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_LIST_CLASS,
  UI_NAME_CARD_BASE_CLASS,
  UI_NAME_CARD_COMPACT_HEIGHT_CLASS,
  UI_NAME_CARD_DETAILED_HEIGHT_CLASS,
  UI_NAME_CARD_DEFAULT_CLASS,
  UI_NAME_CARD_HOVER_CLASS,
  UI_NAME_CARD_SELECTED_CLASS,
  UI_NAME_CARD_DISABLED_CLASS,
  UI_NAME_CARD_READONLY_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
  UI_NAME_CARD_NAME_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_DOMAIN_CLASS,
  UI_NAME_CARD_DOMAIN_HEIGHT_CLASS,
  UI_NAME_CARD_META_CLASS,
  UI_NAME_CARD_PRICE_CLASS,
  UI_NAME_CARD_PRICE_HEIGHT_CLASS,
  UI_NAME_CARD_BADGE_SLOT_CLASS,
  UI_NAME_CARD_BADGE_SKELETON_CLASS,
  formatUiNameCardPrice,
  resolveUiNameCardBadge,
  resolveUiNameCardClasses,
} from '@/components/ui/uiNameCard'

/**
 * `UiNameCard` class map — Figma `3719:5978`, DP-15258 phases 15 and 16 (the
 * redesign of steps 4 and 3 on one primitive).
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * The numbers were measured on four canvases and on the exported symbols, not
 * copied from the plan. The card is **64** on step 4 and **76** on step 3: 76
 * is the height with the domain line on, which step 4 hides, leaving the 32
 * checkbox plus 16 of padding on each side.
 *
 * Verified to fail: give the card `h-[128px]` back, let the selected state
 * hover, swap the inset ring for a border (the 1px → 2px jump the ring exists
 * to avoid), put the tile grid's auto-fill formula back, lay step 3 out in two
 * columns, or let a skeleton's bar height drift away from its line box.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const plain = resolveUiNameCardClasses()
const selected = resolveUiNameCardClasses({ selected: true })
const disabled = resolveUiNameCardClasses({ disabled: true })
const readonly = resolveUiNameCardClasses({ readonly: true })
const detailed = resolveUiNameCardClasses({ detailed: true })

const ALL = [
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_LIST_CLASS,
  plain,
  selected,
  disabled,
  readonly,
  detailed,
  UI_NAME_CARD_TEXT_CLASS,
  UI_NAME_CARD_NAME_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_DOMAIN_CLASS,
  UI_NAME_CARD_DOMAIN_HEIGHT_CLASS,
  UI_NAME_CARD_META_CLASS,
  UI_NAME_CARD_PRICE_CLASS,
  UI_NAME_CARD_PRICE_HEIGHT_CLASS,
  UI_NAME_CARD_BADGE_SLOT_CLASS,
  UI_NAME_CARD_BADGE_SKELETON_CLASS,
]

describe('kit name card — Figma 3719:5978, measured on the drawn screens', () => {
  it('is 64 with the name alone and 76 with the domain line', () => {
    // Step 4 `4071:7776` / `5387:105124`: checkbox 32 at y=16 → 16 + 32 + 16.
    // Step 3 `4071:7400` / `3719:5979`: text frame 44 at y=16 → 16 + 44 + 16.
    expect(UI_NAME_CARD_COMPACT_HEIGHT_CLASS).toBe('h-16')
    expect(UI_NAME_CARD_DETAILED_HEIGHT_CLASS).toBe('h-19')
    expect(plain).toContain('h-16')
    expect(detailed).toContain('h-19')
    expect(detailed).not.toContain('h-16')
    // The height may not live in the shared base class: two screens, two
    // heights, and a carrier that assembles the card by hand would lose it.
    expect(UI_NAME_CARD_BASE_CLASS).not.toMatch(/\bh-\d/)
    for (const value of [plain, detailed]) {
      expect(value).not.toContain('h-[128px]')
    }
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

  it('shows someone else’s pick as the same card with nothing to click', () => {
    // «Вибір замовника» — `5387:105118` is this card in State = Default, the
    // circle empty. It is a display, so no hover and no pointer.
    expect(readonly).toContain(UI_NAME_CARD_READONLY_CLASS)
    expect(readonly).toContain('inset-ring-ink-300')
    expect(readonly).not.toContain('hover:')
    expect(readonly).not.toContain('cursor-pointer')
  })

  it('never writes a hex: the kit colours live in app.css as tokens', () => {
    for (const value of ALL) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
    }
  })

  it('drops the tracking — these are redesign screens and the kit sets zero', () => {
    for (const value of ALL) {
      expect(value).not.toContain('tracking-')
    }
  })
})

describe('step 3 slots: domain, price, badge — kit 3719:5979', () => {
  it('stacks the domain under the name at gap 4, 12/16 in content/secondary', () => {
    // Export: `(test.com)` at y=28 under a 24 name → gap 4, `fill="#393947"`,
    // which is `--color-ink-800`. The tile painted it #4b4b58, a colour the kit
    // does not contain.
    expect(UI_NAME_CARD_TEXT_CLASS).toContain('flex-col')
    expect(UI_NAME_CARD_TEXT_CLASS).toContain('gap-1')
    expect(UI_NAME_CARD_DOMAIN_CLASS).toContain('text-xs/4')
    expect(UI_NAME_CARD_DOMAIN_CLASS).toContain('text-ink-800')
    expect(UI_NAME_CARD_DOMAIN_CLASS).not.toContain('4b4b58')
  })

  it('fixes the price + badge block at 140 with 16 between them', () => {
    // `Price + Badge` measures 140×24 on the kit symbol and on both drawn
    // instances — the block is what lines the prices and badges up down the
    // list while «Available» (68) and «Sold» (42) differ in width.
    expect(UI_NAME_CARD_META_CLASS).toContain('w-35')
    expect(UI_NAME_CARD_META_CLASS).toContain('gap-4')
    expect(UI_NAME_CARD_META_CLASS).toContain('shrink-0')
    // The price fills what the badge leaves, so the badge stays flush right.
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('flex-1')
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('text-base/6')
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('font-medium')
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('text-ink-900')
  })

  it('right-aligns the number and reserves the badge column, so prices line up', () => {
    // Owner's call, divergence row 50, in two halves that only work together.
    //
    // The kit left-aligns the price inside the fill box, which leaves a hole
    // whenever the price is short — its own Sold row has a 46 gap (glyphs end
    // 396.18, badge starts 442) and our real prices are `$15`, not the mockup's
    // `$1 500`. Right-aligning closed the hole but made the number hang off
    // whichever badge followed it, and «Available» (68) is 26 wider than «Sold»
    // (42) — so the numbers stepped down a mixed list.
    //
    // Reserving the badge column at the widest badge's width makes the price
    // box identical in every row, which is what puts the numbers in one line.
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('text-right')
    expect(UI_NAME_CARD_BADGE_SLOT_CLASS).toContain('min-w-17')
    expect(UI_NAME_CARD_BADGE_SLOT_CLASS).toContain('shrink-0')
    // The badge stays flush with the card's right padding inside that column.
    expect(UI_NAME_CARD_BADGE_SLOT_CLASS).toContain('justify-end')
    // Reserved, not fixed: a third, longer label must not be clipped silently.
    expect(UI_NAME_CARD_BADGE_SLOT_CLASS).not.toMatch(/(^|\s)w-\d+(\s|$)/)
    // The skeleton's placeholder is that same column.
    expect(UI_NAME_CARD_BADGE_SKELETON_CLASS).toContain('w-17')
  })

  it('reserves that column only where rows actually carry badges', () => {
    // «Вибір замовника» has no availability in any row, so 68 of reserved air
    // against the card's right edge would be a defect, not an alignment.
    const card = read('components/ui/UiNameCard.vue')
    const external = read(
      'components/constructor/alternative-selection/ExternalNamingGrid.vue'
    )
    const authorRow = read('components/constructor/alternative-selection/AuthorNamingsRow.vue')
    expect(card).toContain('reserveBadge')
    expect(external).toContain('reserve-badge')
    expect(authorRow).not.toContain('reserve-badge')
  })

  it('formats the price the way the mockup writes it', () => {
    // `uk-UA` groups with U+00A0, not a plain space — the mockup's `$1 500`.
    expect(formatUiNameCardPrice(1500)).toBe('$1 500')
    expect(formatUiNameCardPrice(null)).toBe('')
    expect(formatUiNameCardPrice(undefined)).toBe('')
    expect(formatUiNameCardPrice(Number.NaN)).toBe('')
    expect(formatUiNameCardPrice(0)).toBe('$0')
  })

  it('maps availability onto the two kit tones and nothing else', () => {
    // `5382:46492` → badge/*/green, `5382:48314` → badge/*/red. `unknown` is
    // drawn nowhere, so it gets no badge rather than an invented one.
    expect(resolveUiNameCardBadge('available')).toEqual({ tone: 'green', label: 'Available' })
    expect(resolveUiNameCardBadge('sold')).toEqual({ tone: 'red', label: 'Sold' })
    expect(resolveUiNameCardBadge('unknown')).toBeNull()
    expect(resolveUiNameCardBadge(null)).toBeNull()
  })

  it('does not dim a sold row — the kit paints it like any other', () => {
    // `5382:48314` is a sold card: `name card/border/default`, the name still
    // `name card/content/primary`. Only the badge changes.
    expect(detailed).not.toContain('opacity-50')
    expect(detailed).toContain('inset-ring-ink-300')
  })
})

describe('the two layouts, each shared with its skeleton', () => {
  it('step 4 fixes the two columns the mockup fixes', () => {
    // `4071:7486`: cards at x 0 and 254 of a 500 container; `5387:104658`:
    // x 0 and 267.5 of 527. Two columns on both canvases.
    expect(UI_NAME_CARD_GRID_CLASS).toContain('repeat(2,minmax(0,1fr))')
    expect(UI_NAME_CARD_GRID_CLASS).toContain('gap-2')
    // The tile grids' density handle does not apply to a row card: at our real
    // container widths auto-fill lands on 1 or 3, never 2.
    expect(UI_NAME_CARD_GRID_CLASS).not.toContain('auto-fill')
    expect(UI_NAME_CARD_GRID_CLASS).not.toContain('9rem')
  })

  it('step 3 is one column, gap 8 — the 84 row pitch minus the 76 card', () => {
    // `4071:7082`, `5382:37529` and `5395:107506` all draw five cards at x 0,
    // full container width, 84 apart.
    expect(UI_NAME_CARD_LIST_CLASS).toContain('flex flex-col')
    expect(UI_NAME_CARD_LIST_CLASS).toContain('gap-2')
    expect(UI_NAME_CARD_LIST_CLASS).not.toContain('grid')
    expect(UI_NAME_CARD_LIST_CLASS).not.toContain('auto-fill')
  })

  it('still cannot overflow a narrow container', () => {
    // This is the half of the named invariant that survives: `minmax(0,1fr)`
    // never grows past its track, and the text truncates instead.
    expect(UI_NAME_CARD_GRID_CLASS).toContain('minmax(0,1fr)')
    expect(UI_NAME_CARD_TEXT_CLASS).toContain('min-w-0')
    expect(UI_NAME_CARD_NAME_CLASS).toContain('truncate')
    expect(UI_NAME_CARD_DOMAIN_CLASS).toContain('truncate')
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('truncate')
  })

  it('hands the skeletons the same line boxes the text has', () => {
    // `text-xl/6` IS 24 of line box, `text-xs/4` is 16, `text-base/6` is 24 —
    // a grey bar has none, so each number travels as its own constant and this
    // test pins every pair.
    expect(UI_NAME_CARD_NAME_CLASS).toContain('text-xl/6')
    expect(UI_NAME_CARD_NAME_HEIGHT_CLASS).toBe('h-6')
    expect(UI_NAME_CARD_DOMAIN_CLASS).toContain('text-xs/4')
    expect(UI_NAME_CARD_DOMAIN_HEIGHT_CLASS).toBe('h-4')
    expect(UI_NAME_CARD_PRICE_CLASS).toContain('text-base/6')
    expect(UI_NAME_CARD_PRICE_HEIGHT_CLASS).toBe('h-6')
    // The badge placeholder is the kit instance's 68×24 at radius 1000.
    expect(UI_NAME_CARD_BADGE_SKELETON_CLASS).toBe('h-6 w-17 rounded-full')
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
    expect(skeleton).toContain('resolveUiNameCardClasses')
    expect(skeleton).toContain('UI_NAME_CARD_NAME_HEIGHT_CLASS')
    expect(skeleton).not.toContain('h-[128px]')
    expect(skeleton).not.toContain('9rem')
    expect(skeleton).not.toMatch(/max-w-\[\d+px\]/)
  })

  it('«Вибір замовника» is the same card, not a grey tile beside it', () => {
    // The alternative flow shows this block directly above the list. Leaving
    // it a 128 tile while the list became 64 rows is what QA caught.
    const preview = read(
      'components/constructor/alternative-selection/AuthorInternalNamingPreview.vue'
    )
    const previewSkeleton = read(
      'components/constructor/skeletons/AuthorInternalNamingPreviewSkeleton.vue'
    )
    for (const source of [preview, previewSkeleton]) {
      expect(source).toContain('UI_NAME_CARD_GRID_CLASS')
      expect(source).not.toContain('h-[128px]')
      expect(source).not.toContain('#f1f1f3')
      expect(source).not.toContain('grid-cols-3')
      expect(source).not.toMatch(/max-w-\[\d+px\]/)
    }
    expect(preview).toContain('readonly')
    expect(preview).not.toContain('#1a1a1a')
  })

  it('single selection still leaves this component — the store owns it', () => {
    // The redesign is markup only: the props and the event are the contract all
    // four call sites depend on, and a broken selection looks fine on screen.
    expect(grid).toContain('selectedId')
    expect(grid).toContain("select: [namingId: string]")
    expect(grid).toContain("emit('select', naming.id)")
  })
})

describe('step 3 is on the primitive — phase 16', () => {
  const grid = read('components/constructor/alternative-selection/ExternalNamingGrid.vue')
  const skeleton = read('components/constructor/skeletons/ExternalNamingGridSkeleton.vue')
  const authorRow = read('components/constructor/alternative-selection/AuthorNamingsRow.vue')
  const authorSkeleton = read('components/constructor/skeletons/AuthorNamingsRowSkeleton.vue')

  it('the list renders UiNameCard in one column instead of tiles', () => {
    expect(grid).toContain('UiNameCard')
    expect(grid).toContain('UI_NAME_CARD_LIST_CLASS')
    expect(grid).toContain('detailed')
    expect(grid).not.toContain('auto-fill')
    expect(grid).not.toContain('py-10')
    expect(grid).not.toContain('rounded-[100px]')
    expect(grid).not.toContain('#1a1a1a')
    expect(grid).not.toContain('#4b4b58')
    expect(grid).not.toContain('CheckIcon')
  })

  it('the skeleton imports the geometry instead of copying it', () => {
    expect(skeleton).toContain('UI_NAME_CARD_LIST_CLASS')
    expect(skeleton).toContain('resolveUiNameCardClasses')
    expect(skeleton).toContain('UI_NAME_CARD_META_CLASS')
    expect(skeleton).toContain('UI_NAME_CARD_BADGE_SKELETON_CLASS')
    expect(skeleton).not.toContain('auto-fill')
    expect(skeleton).not.toContain('py-10')
    expect(skeleton).not.toMatch(/w-\[\d+px\]/)
  })

  it('«Вибір замовника» here is the same card too, and its action is a kit link', () => {
    // Phase 15's lesson: the block sits on the screen phase 16 redraws, so it
    // is inside phase 16 whatever the plan's file list said. Phase 10 left the
    // raw «Обрати ці назви» button here for exactly this session.
    for (const source of [authorRow, authorSkeleton]) {
      expect(source).toContain('UI_NAME_CARD_LIST_CLASS')
      expect(source).not.toContain('grid-cols-3')
      expect(source).not.toContain('#f1f1f3')
      expect(source).not.toContain('#1a1a1a')
      expect(source).not.toContain('py-10')
      expect(source).not.toMatch(/max-w-\[\d+px\]/)
    }
    expect(authorRow).toContain('UiLink')
    expect(authorRow).not.toContain('<button')
  })

  it('the banner above the list is the kit alert, not a hand-drawn cream card', () => {
    // `5395:111306` draws an Alert type = Warning right above this list on the
    // edit flow. Ours was a hand-drawn card at radius 8 with four colours the
    // kit does not contain; `UiAlert` already carries those tokens and already
    // draws the kit's own `WarningCircle` Fill.
    const banner = read('components/constructor/edit-flow/ConceptCascadeBanner.vue')
    expect(banner).toContain('UiAlert')
    expect(banner).toContain('type="warning"')
    expect(banner).not.toContain('<svg')
    expect(banner).not.toMatch(/\[#(fefce8|f5e6bc|eab308|717182|030213)\]/i)
    expect(banner).not.toContain('rounded-lg')
  })

  it('multi-selection still leaves these components — the store owns it', () => {
    // A broken cap or a broken sold rule looks fine on screen, so the contract
    // the four call sites depend on is pinned here.
    expect(grid).toContain("toggle: [namingId: string]")
    expect(grid).toContain("emit('toggle', naming.id)")
    expect(grid).toContain('maxSelectable')
    expect(grid).toContain('isAtLimit')
    // Sold namings stay selectable; only unselected cards are blocked at limit.
    expect(grid).toContain('if (!isSelected(naming) && isAtLimit.value) return true')
    // Available sorts above sold.
    expect(grid).toContain("n.availability_status === 'available' ? 0 : 1")
    expect(authorRow).toContain("toggle: [namingId: string]")
    expect(authorRow).toContain("'select-all': []")
  })
})
