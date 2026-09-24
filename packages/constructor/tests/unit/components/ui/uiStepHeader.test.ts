import { describe, it, expect } from 'vitest'
import {
  UI_STEP_HEADER_DESCRIPTION_CLASS,
  UI_STEP_HEADER_ROOT_CLASS,
  UI_STEP_HEADER_TEXT_CLASS,
  UI_STEP_HEADER_TITLE_CLASS,
  UI_STEP_HEADER_TITLE_ROW_CLASS,
  resolveUiStepHeaderClasses,
} from '@/components/ui/uiStepHeader'

/**
 * `UiStepHeader` class map — Figma `4463:9758` → `3984:8226`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * The point of the phase is that the wizard, the edit flow and the review shell
 * stopped writing three versions of this block. That is guarded here by pinning
 * one string per element: three shells that render the same map cannot drift.
 */

const classes = resolveUiStepHeaderClasses()

const ALL = [
  UI_STEP_HEADER_ROOT_CLASS,
  UI_STEP_HEADER_TEXT_CLASS,
  UI_STEP_HEADER_TITLE_ROW_CLASS,
  UI_STEP_HEADER_TITLE_CLASS,
  UI_STEP_HEADER_DESCRIPTION_CLASS,
]

describe('kit geometry — Figma 3984:8226', () => {
  it('puts 16 between the text block and the alert', () => {
    // Symbol is 440×168: Text ends at y=64, Alert opens at y=80. Both drawn
    // step-8 screens agree — `5387:91772` 64 → 80, `5387:78997` 32 → 48.
    expect(UI_STEP_HEADER_ROOT_CLASS).toBe('ui-step-header flex w-full flex-col gap-4')
  })

  it('has no progress row at all, because the kit has none here', () => {
    // There is no progress node in the symbol — not even hidden — and none on
    // any drawn screen (step 7 `5382:57234` is 88 = 32 + 8 + a two-line 48).
    // In the kit it is the 1px rule at the bottom of `Wizard header`
    // `5382:30951`, and `uiWizardHeader.ts` now draws it there. Divergence 79.
    expect(Object.keys(resolveUiStepHeaderClasses())).not.toContain('progress')
    expect(ALL.join(' ')).not.toContain('progress')
  })

  it('puts 8 between the title row and the description', () => {
    // Title row is 32 tall, Description starts at y=40.
    expect(UI_STEP_HEADER_TEXT_CLASS).toBe('ui-step-header__text flex flex-col gap-2')
  })

  it('puts 8 between the title and its badge, and lets the row wrap', () => {
    // Title is 51 wide, Badge starts at x=59.
    expect(UI_STEP_HEADER_TITLE_ROW_CLASS).toBe(
      'ui-step-header__title-row flex flex-wrap items-center gap-2'
    )
  })

  it('renders the title as kit header l 24/32 medium in #1f1f2e', () => {
    expect(UI_STEP_HEADER_TITLE_CLASS).toBe(
      'ui-step-header__title text-2xl font-medium text-ink-900'
    )
  })

  it('renders the description as kit body 16/24 regular in #6f6f7d', () => {
    expect(UI_STEP_HEADER_DESCRIPTION_CLASS).toBe(
      'ui-step-header__description text-base text-ink-700'
    )
  })
})

describe('the three shells now share one header', () => {
  it('hands every caller the same five strings', () => {
    expect(resolveUiStepHeaderClasses()).toEqual({
      root: UI_STEP_HEADER_ROOT_CLASS,
      text: UI_STEP_HEADER_TEXT_CLASS,
      titleRow: UI_STEP_HEADER_TITLE_ROW_CLASS,
      title: UI_STEP_HEADER_TITLE_CLASS,
      description: UI_STEP_HEADER_DESCRIPTION_CLASS,
    })
  })

  it('drops the review shell 30px title — the mockup instances the same symbol', () => {
    // Key screen 4463:9147 instances Step header at 4463:9151, so step 8 is
    // header l 24/32 like every other step, not text-3xl.
    expect(classes.title).toContain('text-2xl')
    expect(classes.title).not.toContain('text-3xl')
  })

  it('drops the pre-kit literals the edit flow used to hardcode', () => {
    // EditFlowStepShell wrote #0a0a0a / #717182 as arbitrary values, which is
    // why DP-15258 phase 2 could not reach them from --theme.
    for (const value of ALL) {
      expect(value).not.toMatch(/\[#/)
    }
  })
})

describe('embed scale — the header may not opt out of the root font-size', () => {
  it('declares no px, vw, vh or em length at all', () => {
    for (const value of ALL) {
      // The `tracking` exception this loop used to carve out is gone with the
      // tracking itself — the kit sets letter-spacing 0 (divergences row 6).
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      expect(value).not.toMatch(/\[[^\]]*\d(px|vw|vh|dvh|em)\]/)
    }
  })

  it('spaces the header on the rem scale, not on arbitrary values', () => {
    expect(UI_STEP_HEADER_ROOT_CLASS).toContain('gap-4')
    expect(UI_STEP_HEADER_TEXT_CLASS).toContain('gap-2')
    expect(UI_STEP_HEADER_TITLE_ROW_CLASS).toContain('gap-2')
    for (const value of ALL) {
      expect(value).not.toMatch(/gap-\[/)
      expect(value).not.toMatch(/text-\[/)
    }
  })
})
