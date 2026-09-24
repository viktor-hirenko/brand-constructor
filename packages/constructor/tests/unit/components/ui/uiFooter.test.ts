import { describe, it, expect } from 'vitest'
import {
  UI_FOOTER_ACTIONS,
  UI_FOOTER_BUTTON,
  UI_FOOTER_LAYOUT,
  UI_FOOTER_ROOT_CLASS,
  resolveUiFooterClasses,
  type UiFooterLayout,
} from '@/components/ui/uiFooter'
import { EDIT_FLOW_CONTENT_INSET_CLASS } from '@/constants/editFlowLayout'

/**
 * `UiFooter` class map — Figma `3984:7719` (bar) / `4463:9161` (stack) /
 * `4378:16948` (stack with a note).
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const LAYOUTS: UiFooterLayout[] = ['bar', 'stack']

const bar = resolveUiFooterClasses('bar')
const stack = resolveUiFooterClasses('stack')

describe('kit bar — Figma 3984:7719', () => {
  it('draws the top rule in divider/default, the same token as UiDivider', () => {
    expect(UI_FOOTER_LAYOUT.bar).toContain('border-t')
    expect(UI_FOOTER_LAYOUT.bar).toContain('border-ink-300')
  })

  it('fills the bar with bg/alt-1 #f9f9fb', () => {
    // The kit has no @theme token for bg/alt-1 yet (phase 1 brought colours the
    // kit names; this one is a surface). Until it does, the literal lives here
    // and nowhere else — it used to be copied into EditFlowFooter by hand.
    // Since the responsive work this is the same `--color-ink-100` the left
    // column itself uses, so the bar and the pane can no longer drift apart.
    expect(UI_FOOTER_LAYOUT.bar).toContain('bg-ink-100')
  })

  it('insets the buttons by 32 and pads 12 top and bottom', () => {
    // `5395:118753` and its three siblings: 1 + 12 + 48 + 12 = the 73 the bar
    // is drawn at on 1280, 1440 and 1920. The 24/48 this test used to assert
    // came from `3984:7719` on the superseded canvas. Above 1920 the padding
    // doubles to 24 (bar 97) — that is a breakpoint and lives in `app.css`.
    expect(UI_FOOTER_LAYOUT.bar).toContain('px-8')
    expect(UI_FOOTER_LAYOUT.bar).toContain('py-3')
  })

  it('fixes the bar buttons at the kit 128 instead of splitting the column', () => {
    // Every drawn bar puts two 128-wide buttons 8 apart at x=32 and x=168.
    // They were `block` and shared the column, so they grew with the panel —
    // exactly the scaling the kit gives up.
    expect(UI_FOOTER_BUTTON.bar).toBe('w-32')
    expect(UI_FOOTER_BUTTON.stack).toBe('')
  })

  it('keeps the inset equal to the edit-flow body inset — the rule spans the column, the buttons do not', () => {
    expect(UI_FOOTER_LAYOUT.bar).toContain(EDIT_FLOW_CONTENT_INSET_CLASS)
  })

  it('never shrinks: the bar is pinned under the scrolling body', () => {
    expect(UI_FOOTER_LAYOUT.bar).toContain('shrink-0')
  })

  it('lays the two buttons out in a row', () => {
    expect(UI_FOOTER_ACTIONS.bar).toContain('flex')
    expect(UI_FOOTER_ACTIONS.bar).not.toContain('flex-col')
  })
})

describe('kit stack — Figma 4463:9161', () => {
  it('carries no chrome at all: no rule, no fill, no padding', () => {
    expect(UI_FOOTER_LAYOUT.stack).not.toContain('border')
    expect(UI_FOOTER_LAYOUT.stack).not.toContain('bg-')
    expect(UI_FOOTER_LAYOUT.stack).not.toMatch(/\bp[xytblr]?-/)
  })

  it('stacks the buttons in a column', () => {
    expect(UI_FOOTER_ACTIONS.stack).toContain('flex-col')
  })
})

describe('kit spacing — spacing/8 between buttons, spacing/12 above the note', () => {
  it('puts 8 between the buttons in both shapes', () => {
    for (const layout of LAYOUTS) {
      expect(UI_FOOTER_ACTIONS[layout]).toContain('gap-2')
      expect(UI_FOOTER_ACTIONS[layout]).not.toContain('gap-3')
    }
  })

  it('puts 12 between the buttons and the note (4378:16948)', () => {
    expect(UI_FOOTER_ROOT_CLASS).toContain('gap-3')
  })

  it('leaves no trace of the three recipes it replaced', () => {
    // wizard `gap-3` between buttons, review `space-y-3`, review `rounded-xl`.
    for (const layout of LAYOUTS) {
      const all = `${resolveUiFooterClasses(layout).root} ${resolveUiFooterClasses(layout).actions}`
      expect(all).not.toContain('space-y-')
      expect(all).not.toContain('rounded-xl')
      expect(all).not.toContain('border-black/10')
    }
  })
})

describe('embed scale — the footer may not opt out of the root font-size', () => {
  it.each(LAYOUTS)('emits no px, em, vw or vh length for %s', layout => {
    const { root, actions } = resolveUiFooterClasses(layout)
    // `bg-[#f9f9fb]` is a colour, not a length, and the 1px top rule is the
    // documented hairline exception — it is spelled `border-t`, never `border-[…]`.
    const lengths = `${root} ${actions}`.replace(/bg-\[#[0-9a-fA-F]{3,8}\]/g, '')
    expect(lengths).not.toMatch(/\d*\.?\d+px/)
    expect(lengths).not.toMatch(/(?<!r)\d*\.?\d+(em|vw|vh|dvh)\b/)
    expect(lengths).not.toMatch(/\[\d/)
  })

  it('lets the column shrink inside a narrow embed panel', () => {
    expect(UI_FOOTER_ROOT_CLASS).toContain('min-w-0')
    for (const layout of LAYOUTS) {
      expect(UI_FOOTER_ACTIONS[layout]).toContain('min-w-0')
    }
  })
})

describe('BEM hooks', () => {
  it('names the block and both shapes', () => {
    expect(UI_FOOTER_ROOT_CLASS.startsWith('ui-footer ')).toBe(true)
    expect(UI_FOOTER_LAYOUT.bar).toContain('ui-footer--bar')
    expect(UI_FOOTER_LAYOUT.stack).toContain('ui-footer--stack')
    for (const layout of LAYOUTS) {
      expect(UI_FOOTER_ACTIONS[layout]).toContain('ui-footer__actions')
    }
  })

  it('defaults to the bar — the shape three of the four shells use', () => {
    expect(resolveUiFooterClasses()).toEqual(bar)
    expect(bar).not.toEqual(stack)
  })
})
