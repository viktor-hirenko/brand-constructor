import { describe, it, expect } from 'vitest'
import {
  UI_PROGRESS_BAR_FILL_CLASS,
  UI_PROGRESS_BAR_LABEL_CLASS,
  UI_PROGRESS_BAR_ROOT_CLASS,
  UI_PROGRESS_BAR_TRACK_CLASS,
  clampProgressPercent,
  formatStepLabel,
  resolveUiProgressBarClasses,
} from '@/components/ui/uiProgressBar'

/**
 * `UiProgressBar` class map — Figma `3889:2807` / `3889:2849`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const classes = resolveUiProgressBarClasses()
const ALL = [
  UI_PROGRESS_BAR_ROOT_CLASS,
  UI_PROGRESS_BAR_LABEL_CLASS,
  UI_PROGRESS_BAR_TRACK_CLASS,
  UI_PROGRESS_BAR_FILL_CLASS,
]

describe('kit geometry — Figma 3889:2849', () => {
  it('stacks a 16-tall label, an 8 gap and an 8-tall track — 32 in total', () => {
    // Symbol: label y=0 h=16, bar y=24 h=8.
    expect(UI_PROGRESS_BAR_ROOT_CLASS).toBe('ui-progress-bar flex w-full flex-col gap-2')
    expect(UI_PROGRESS_BAR_LABEL_CLASS).toContain('text-sm/4')
    expect(UI_PROGRESS_BAR_TRACK_CLASS).toContain('h-2')
  })

  it('keeps the label on caption l 14/16, not on the 14/20 default', () => {
    // `text-sm` alone is 14/20 and would make the block 36 tall, not 32.
    expect(UI_PROGRESS_BAR_LABEL_CLASS).toContain('text-sm/4')
    expect(UI_PROGRESS_BAR_LABEL_CLASS).not.toMatch(/text-sm(?!\/)/)
  })

  it('rounds both track and fill fully — kit radius/progress-bar 1000', () => {
    expect(UI_PROGRESS_BAR_TRACK_CLASS).toContain('rounded-full')
    expect(UI_PROGRESS_BAR_FILL_CLASS).toContain('rounded-full')
    for (const value of ALL) {
      expect(value).not.toMatch(/rounded-\[/)
    }
  })
})

describe('one recipe, not two', () => {
  it('paints the track ink-300 #ededee and the fill primary #030213', () => {
    // The wizard used bg-muted/bg-primary, the review shell bg-black/10 and
    // bg-foreground. The kit says #ededee and #030213 — this is the only pair.
    expect(UI_PROGRESS_BAR_TRACK_CLASS).toContain('bg-ink-300')
    expect(UI_PROGRESS_BAR_FILL_CLASS).toContain('bg-primary')
  })

  it('leaves no trace of the review shell recipe', () => {
    for (const value of ALL) {
      expect(value).not.toContain('bg-black/10')
      expect(value).not.toContain('bg-foreground')
    }
  })

  it('hands every caller the same four strings', () => {
    expect(resolveUiProgressBarClasses()).toEqual({
      root: UI_PROGRESS_BAR_ROOT_CLASS,
      label: UI_PROGRESS_BAR_LABEL_CLASS,
      track: UI_PROGRESS_BAR_TRACK_CLASS,
      fill: UI_PROGRESS_BAR_FILL_CLASS,
    })
  })
})

describe('embed scale — the bar may not opt out of the root font-size', () => {
  it('declares no px, vw, vh or em length outside tracking', () => {
    for (const value of ALL) {
      const withoutTracking = value.replace(/tracking-\[[^\]]+\]/g, '')
      expect(withoutTracking).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      expect(withoutTracking).not.toMatch(/\[[^\]]*\d(px|vw|vh|dvh|em)\]/)
    }
  })

  it('keeps the track height on the rem spacing scale', () => {
    expect(classes.track).toContain('h-2')
    expect(classes.track).not.toMatch(/h-\[/)
  })
})

describe('percentage is clamped, not trusted', () => {
  it('passes a normal percentage through', () => {
    expect(clampProgressPercent(0)).toBe(0)
    expect(clampProgressPercent(37.5)).toBe(37.5)
    expect(clampProgressPercent(100)).toBe(100)
  })

  it('refuses to push the fill past the track or behind its start', () => {
    expect(clampProgressPercent(140)).toBe(100)
    expect(clampProgressPercent(-20)).toBe(0)
  })

  it('treats a broken number as zero rather than rendering NaN%', () => {
    expect(clampProgressPercent(Number.NaN)).toBe(0)
    expect(clampProgressPercent(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('label copy is shared, so the shells cannot word it differently', () => {
  it('formats the kit label', () => {
    expect(formatStepLabel(3, 8)).toBe('Крок 3 з 8')
    expect(formatStepLabel(8, 8)).toBe('Крок 8 з 8')
  })
})
