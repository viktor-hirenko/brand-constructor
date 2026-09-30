import { describe, it, expect } from 'vitest'
import {
  UI_DIVIDER_BASE_CLASS,
  UI_DIVIDER_ORIENTATION,
  resolveUiDividerClasses,
} from '@/components/ui/uiDivider'
import { EDIT_FLOW_DIVIDER_CLASS } from '@/constants/editFlowLayout'

/**
 * `UiDivider` class map — Figma `3446:5229` (horizontal) / `5259:79966`
 * (vertical).
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const horizontal = resolveUiDividerClasses('horizontal')
const vertical = resolveUiDividerClasses('vertical')

describe('kit rule — Figma 3446:5230', () => {
  it('paints the rule divider/default #ededee via ink-300', () => {
    expect(UI_DIVIDER_BASE_CLASS).toContain('border-ink-300')
    expect(horizontal).toContain('border-ink-300')
    expect(vertical).toContain('border-ink-300')
  })

  it('resets all four borders before turning one back on', () => {
    // `<hr>` arrives with a UA border on every side; without the reset the
    // vertical variant would draw the horizontal line as well.
    expect(UI_DIVIDER_BASE_CLASS).toContain('border-0')
    expect(UI_DIVIDER_ORIENTATION.horizontal).toContain('border-t')
    expect(UI_DIVIDER_ORIENTATION.vertical).toContain('border-l')
  })

  it('draws exactly one side per orientation', () => {
    expect(horizontal).toContain('border-t')
    expect(horizontal).not.toContain('border-l')
    expect(vertical).toContain('border-l')
    expect(vertical).not.toContain('border-t')
  })

  it('defaults to horizontal — every call site in the tree is a horizontal rule', () => {
    expect(resolveUiDividerClasses()).toBe(horizontal)
  })

  it('never shrinks in a flex column', () => {
    expect(horizontal).toContain('shrink-0')
    expect(vertical).toContain('shrink-0')
  })
})

describe('embed scale — the rule may not opt out of the root font-size', () => {
  it('carries no length at all: the hairline is the border, nothing else', () => {
    // The 1px border itself is the documented exception (at an 11px root a rem
    // hairline resolves to 0.69px and renders as grey mush), and it is spelled
    // `border-t` / `border-l`, never as an arbitrary value.
    for (const value of [horizontal, vertical]) {
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      expect(value).not.toMatch(/border-\[/)
      expect(value).not.toMatch(/[whm][-a-z]*-\[/)
    }
  })
})

describe('the edit-flow rules keep their spacing and their full-bleed hook', () => {
  it('leaves colour to UiDivider and keeps only my-12 plus the :deep() hook', () => {
    // EditFlowStepShell reaches for `.edit-flow-divider` with :deep() to pull
    // the rule out of the 48px inset. Renaming it silently un-bleeds 10 rules.
    //
    // 32: the refactor mockups give the rule the container's own 32 on both
    // sides — CEO reselect `5387:102295` (card ends 326.3, rule 358.3, next
    // block 390.3), `5387:104945`, author revision `5395:107475`. It was 48
    // after the old `4492:27189`, 40 before that.
    expect(EDIT_FLOW_DIVIDER_CLASS).toBe('edit-flow-divider my-8')
  })

  it('no longer carries the pre-kit black/10 rule', () => {
    expect(EDIT_FLOW_DIVIDER_CLASS).not.toContain('border')
    expect(EDIT_FLOW_DIVIDER_CLASS).not.toContain('black/10')
  })
})
