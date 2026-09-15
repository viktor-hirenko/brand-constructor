import { describe, it, expect } from 'vitest'
import {
  UI_LIST_ITEM_BASE_CLASS,
  UI_LIST_ITEM_DISABLED_CLASS,
  UI_LIST_ITEM_ICON_CLASS,
  UI_LIST_ITEM_INTERACTIVE_CLASS,
  UI_LIST_ITEM_LABEL_CLASS,
  UI_LIST_ITEM_SECONDARY_CLASS,
  UI_LIST_ITEM_SELECTED_CLASS,
  UI_POPOVER_CLASS,
  UI_POPOVER_HEADER_CLASS,
  resolveUiListItemClasses,
} from '@/components/ui/uiListItem'

/**
 * Kit List item `3446:5054` and Popover `3446:5235`, both inside the Dropdown
 * section `3446:5148`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit list item — Figma 3446:5054', () => {
  describe('the four states', () => {
    it('Default is unpainted and hovers to input/list/item/bg/hovered', () => {
      // get_variable_defs 3446:5054 → #f9f9fb, which app.css carries as
      // --color-ink-100. It is the one kit neutral the scale was missing, and
      // the same value is comment/bg/default for phase 13.
      const classes = resolveUiListItemClasses()
      expect(classes).toContain('hover:bg-ink-100')
      expect(classes).not.toContain(UI_LIST_ITEM_SELECTED_CLASS)
    })

    it('Selected paints input/list/item/bg/selected', () => {
      // #f3f3f5 → ink-200, the same neutral the input fill takes.
      expect(resolveUiListItemClasses({ selected: true })).toContain('bg-ink-200')
    })

    it('Disabled is opacity/50 with no hover', () => {
      const classes = resolveUiListItemClasses({ disabled: true })
      expect(classes).toContain('opacity-50')
      expect(classes).not.toContain('hover:bg-ink-100')
      expect(classes).not.toContain(UI_LIST_ITEM_INTERACTIVE_CLASS)
    })

    it('keeps Selected visible while Disabled', () => {
      // A disabled option that is also the current value must still read as
      // chosen; the kit fades the whole symbol rather than dropping the fill.
      const classes = resolveUiListItemClasses({ selected: true, disabled: true })
      expect(classes).toContain(UI_LIST_ITEM_SELECTED_CLASS)
      expect(classes).toContain(UI_LIST_ITEM_DISABLED_CLASS)
    })
  })

  describe('geometry', () => {
    it('is 40 tall at a 14/16 line: py-3 on both sides', () => {
      // get_metadata 3446:5053: symbol 297×40, Icon left at y=12, label 16 tall.
      expect(UI_LIST_ITEM_BASE_CLASS).toContain('py-3')
      expect(UI_LIST_ITEM_BASE_CLASS).toContain('text-sm/4')
    })

    it('insets 8 and lets the label carry the remaining 4', () => {
      // Icon left at x=8; the Label frame starts at x=24 with its text at x=4,
      // so the glyph-to-text gap is 4 and a label with no glyph sits at 12 —
      // which is exactly where the Header puts its text (3446:5102, x=12).
      expect(UI_LIST_ITEM_BASE_CLASS).toContain('px-2')
      expect(UI_LIST_ITEM_LABEL_CLASS).toContain('px-1')
      expect(UI_LIST_ITEM_BASE_CLASS).not.toMatch(/(^|\s)gap-/)
    })

    it('carries radius/input-list-item 4 and a 16 glyph', () => {
      // `rounded-sm` is Tailwind's 0.25rem = 4.
      expect(UI_LIST_ITEM_BASE_CLASS).toContain('rounded-sm')
      expect(UI_LIST_ITEM_ICON_CLASS).toContain('size-4')
      expect(UI_LIST_ITEM_ICON_CLASS).toContain('shrink-0')
    })

    it('states every length in rem-based utilities, never px', () => {
      const geometry = [
        UI_LIST_ITEM_BASE_CLASS,
        UI_LIST_ITEM_ICON_CLASS,
        UI_LIST_ITEM_LABEL_CLASS,
        UI_POPOVER_HEADER_CLASS,
        // The popover shadow is exempt: shadow offsets are on the ⚠️ list in
        // "Железные правила адаптива", like the Solid icon-button shadow.
        UI_POPOVER_CLASS.replace(/shadow-\[[^\]]+\]/, ''),
      ].join(' ')
      expect(geometry).not.toMatch(/\[-?\d*\.?\d+px\]/)
    })
  })

  describe('colour', () => {
    it('takes both content slots from the kit', () => {
      // input/list/item/content/primary #1f1f2e, secondary #6f6f7d.
      expect(UI_LIST_ITEM_BASE_CLASS).toContain('text-ink-900')
      expect(UI_LIST_ITEM_SECONDARY_CLASS).toContain('text-ink-700')
    })

    it('writes no raw hex', () => {
      const all = [
        UI_LIST_ITEM_BASE_CLASS,
        UI_LIST_ITEM_SELECTED_CLASS,
        UI_LIST_ITEM_DISABLED_CLASS,
        UI_LIST_ITEM_INTERACTIVE_CLASS,
        UI_POPOVER_HEADER_CLASS,
        // Same shadow exemption as above — an effect, not a colour slot.
        UI_POPOVER_CLASS.replace(/shadow-\[[^\]]+\]/, ''),
      ].join(' ')
      expect(all).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    })
  })
})

describe('kit popover — Figma 3446:5235', () => {
  it('is white with input/list/border at radius/input-list and 4 of padding', () => {
    // get_variable_defs 3446:5235 → input/list/bg #ffffff,
    // input/list/border #f3f3f5, radius/input-list 8, spacing/4.
    expect(UI_POPOVER_CLASS).toContain('bg-white')
    expect(UI_POPOVER_CLASS).toContain('border-ink-200')
    expect(UI_POPOVER_CLASS).toContain('rounded-lg')
    expect(UI_POPOVER_CLASS).toContain('p-1')
  })

  it('carries a shadow the kit does not draw, on purpose', () => {
    // The kit lays the symbol flat on the canvas. A popover that floats over
    // content needs a shadow or it reads as part of the page; this is the one
    // the brief-order dropdown already carried, kept rather than re-invented.
    expect(UI_POPOVER_CLASS).toMatch(/shadow-\[/)
  })

  it('draws the Header at 32 tall in input/list/header', () => {
    // get_metadata 3446:5102: 32-tall box, text at x=12 y=8 → px-3 py-2 on a
    // 16 line. #95959d → ink-600, caption l MEDIUM.
    expect(UI_POPOVER_HEADER_CLASS).toContain('px-3')
    expect(UI_POPOVER_HEADER_CLASS).toContain('py-2')
    expect(UI_POPOVER_HEADER_CLASS).toContain('text-sm/4')
    expect(UI_POPOVER_HEADER_CLASS).toContain('font-medium')
    expect(UI_POPOVER_HEADER_CLASS).toContain('text-ink-600')
  })

  it('positions nothing — that stays at the call site', () => {
    // The three popovers in the wizard place themselves three different ways,
    // one of which escapes the shell's transform via Teleport. Folding those
    // into the component would re-open a decision "Железные правила адаптива"
    // puts out of bounds for a вынос phase.
    expect(UI_POPOVER_CLASS).not.toMatch(/(^|\s)(absolute|fixed|relative)(\s|$)/)
    expect(UI_POPOVER_CLASS).not.toMatch(/(^|\s)z-/)
  })
})
