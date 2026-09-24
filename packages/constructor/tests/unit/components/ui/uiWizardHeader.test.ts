import { describe, it, expect } from 'vitest'
import {
  UI_WIZARD_HEADER_CLOSE_CLASS,
  UI_WIZARD_HEADER_CLOSE_ICON_CLASS,
  UI_WIZARD_HEADER_CONTENT_CLASS,
  UI_WIZARD_HEADER_PROGRESS_FILL_CLASS,
  UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS,
  UI_WIZARD_HEADER_ROOT_CLASS,
  UI_WIZARD_HEADER_TITLE,
  UI_WIZARD_HEADER_TITLE_CLASS,
  UI_WIZARD_HEADER_TITLE_ROW_CLASS,
  formatWizardStepBadge,
  resolveUiWizardHeaderClasses,
  wizardProgressPercent,
} from '@/components/ui/uiWizardHeader'

/**
 * `UiWizardHeader` class map — Figma `Wizard header` `5382:30951`, 1230×73.
 *
 * This was the one component of the kit's 34 with no counterpart in the tree,
 * so there is no "it used to look like X" here — every number below is read off
 * the symbol export and `get_variable_defs`, and the drawn 1440 breakpoint
 * `5395:118730` supplies the two that the symbol leaves as placeholder text:
 * the title copy and the badge shape.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * Verified to fail, not assumed to: change `py-6` to `py-4` and the height test
 * goes red; round the progress share and the 1/8 test goes red.
 */

const ALL = [
  UI_WIZARD_HEADER_ROOT_CLASS,
  UI_WIZARD_HEADER_CONTENT_CLASS,
  UI_WIZARD_HEADER_TITLE_ROW_CLASS,
  UI_WIZARD_HEADER_TITLE_CLASS,
  UI_WIZARD_HEADER_CLOSE_CLASS,
  UI_WIZARD_HEADER_CLOSE_ICON_CLASS,
]

describe('kit geometry — Figma 5382:30951', () => {
  it('builds the 73 out of the kit padding, not out of a height', () => {
    // Content is 1230×72 = py 24 + a 24 row + py 24; the 73rd pixel is the
    // bottom rule. Nothing here may state a height: the row grows with the
    // title, exactly as the symbol does.
    expect(UI_WIZARD_HEADER_CONTENT_CLASS).toContain('py-6')
    expect(UI_WIZARD_HEADER_CONTENT_CLASS).toContain('px-8')
    expect(UI_WIZARD_HEADER_ROOT_CLASS).toContain('border-b')
    expect(ALL.join(' ')).not.toMatch(/\bh-\d/)
  })

  it('caps the content at the kit 1700 and keeps it centred', () => {
    // The cap is the kit's own, stated on the 2560 breakpoint `5395:119538`.
    expect(UI_WIZARD_HEADER_CONTENT_CLASS).toContain('max-w-[1700px]')
    expect(UI_WIZARD_HEADER_ROOT_CLASS).toContain('items-center')
  })

  it('paints the bar white on the kit hairline #eaeaeb', () => {
    // bg/body #ffffff = --color-card; accordion/border/default #eaeaeb = ink-300.
    expect(UI_WIZARD_HEADER_ROOT_CLASS).toContain('bg-card')
    expect(UI_WIZARD_HEADER_ROOT_CLASS).toContain('border-ink-300')
  })

  it('renders the title as kit header/m 20/24 medium in #1f1f2e', () => {
    expect(UI_WIZARD_HEADER_TITLE_CLASS).toContain('text-xl/6')
    expect(UI_WIZARD_HEADER_TITLE_CLASS).toContain('font-medium')
    expect(UI_WIZARD_HEADER_TITLE_CLASS).toContain('text-ink-900')
  })

  it('puts 8 between the title and the step badge, 16 before the cross', () => {
    // Title + Badge is a flex-1 row at gap 8; Content's own gap is 16.
    expect(UI_WIZARD_HEADER_TITLE_ROW_CLASS).toContain('gap-2')
    expect(UI_WIZARD_HEADER_TITLE_ROW_CLASS).toContain('flex-1')
    expect(UI_WIZARD_HEADER_CONTENT_CLASS).toContain('gap-4')
  })

  it('draws the cross as a bare 24 glyph in content/tertiary', () => {
    // The kit gives it no button chrome at all — no fill, no border, no radius.
    expect(UI_WIZARD_HEADER_CLOSE_CLASS).toContain('size-6')
    expect(UI_WIZARD_HEADER_CLOSE_CLASS).toContain('text-ink-700')
    expect(UI_WIZARD_HEADER_CLOSE_CLASS).not.toMatch(/\bbg-|\brounded-|\bborder\b/)
    expect(UI_WIZARD_HEADER_CLOSE_ICON_CLASS).toContain('size-6')
  })

  it('pins the progress as a 1px track with a 3px fill riding above it', () => {
    // The symbol: track h-px at bottom -1, fill h-3px at top -2. Both are
    // hairlines, which is the documented px exception.
    expect(UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS).toContain('h-px')
    expect(UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS).toContain('-bottom-px')
    expect(UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS).toContain('bg-ink-300')
    expect(UI_WIZARD_HEADER_PROGRESS_FILL_CLASS).toContain('h-[3px]')
    expect(UI_WIZARD_HEADER_PROGRESS_FILL_CLASS).toContain('-top-0.5')
    expect(UI_WIZARD_HEADER_PROGRESS_FILL_CLASS).toContain('bg-primary')
  })

  it('hands every caller the same eight strings', () => {
    expect(resolveUiWizardHeaderClasses()).toEqual({
      root: UI_WIZARD_HEADER_ROOT_CLASS,
      content: UI_WIZARD_HEADER_CONTENT_CLASS,
      titleRow: UI_WIZARD_HEADER_TITLE_ROW_CLASS,
      title: UI_WIZARD_HEADER_TITLE_CLASS,
      close: UI_WIZARD_HEADER_CLOSE_CLASS,
      closeIcon: UI_WIZARD_HEADER_CLOSE_ICON_CLASS,
      progressTrack: UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS,
      progressFill: UI_WIZARD_HEADER_PROGRESS_FILL_CLASS,
    })
  })
})

describe('copy read off the drawn breakpoint 5395:118730', () => {
  it('titles the bar "Brand Creation"', () => {
    expect(UI_WIZARD_HEADER_TITLE).toBe('Brand Creation')
  })

  it('shapes the badge as the counter, not as the wizard sentence', () => {
    // The drawn 1440 frame reads "2/8". «Крок 2 з 8» was the old labelled bar's
    // copy and belongs to no kit node.
    expect(formatWizardStepBadge(2, 8)).toBe('2/8')
    expect(formatWizardStepBadge(1, 8)).toBe('1/8')
  })
})

describe('the fill is a fraction, not a rounded percentage', () => {
  it('covers exactly 1/8 of the bar on step 1', () => {
    // The symbol ships the fill as `right: 87.5%`. The old bar rounded step 1
    // to 13%, which is a pixel off the drawn line at every step.
    expect(wizardProgressPercent(1, 8)).toBe(12.5)
    expect(wizardProgressPercent(2, 8)).toBe(25)
    expect(wizardProgressPercent(8, 8)).toBe(100)
  })

  it('clamps instead of trusting the caller', () => {
    expect(wizardProgressPercent(-3, 8)).toBe(0)
    expect(wizardProgressPercent(99, 8)).toBe(100)
    expect(wizardProgressPercent(1, 0)).toBe(0)
    expect(wizardProgressPercent(Number.NaN, 8)).toBe(0)
  })
})
