import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  UI_TOGGLE_TRACK_BASE_CLASS,
  UI_TOGGLE_TRACK_ON_CLASS,
  UI_TOGGLE_TRACK_OFF_CLASS,
  UI_TOGGLE_THUMB_BASE_CLASS,
  UI_TOGGLE_THUMB_ON_CLASS,
  UI_TOGGLE_THUMB_OFF_CLASS,
  resolveUiToggleClasses,
} from '@/components/ui/uiToggle'

/**
 * `UiToggle` class map — Figma `3764:6920`, DP-15258 phase 14.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * The geometry pinned below was measured off the exported SVG of both kit
 * symbols, not copied from the plan — the plan said 56×28 with travel 30 and
 * the kit is 48×24 with travel 24. Pinning the measured numbers is the point:
 * the next session reading the plan would otherwise "fix" this back.
 *
 * Verified to fail: set the track to `h-7 w-14`, give the thumb `size-6`, move
 * the travel to `translate-x-7`, paint the off state with anything but
 * `bg-ink-300`, or put the pre-kit recipe back into either call site.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const on = resolveUiToggleClasses(true)
const off = resolveUiToggleClasses(false)

describe('kit toggle — Figma 3764:6920, measured off the export', () => {
  it('is 48×24, not the 56×28 the plan named', () => {
    // <svg width="48" height="24"> in both State=Selected and State=Unselected.
    expect(UI_TOGGLE_TRACK_BASE_CLASS).toContain('h-6')
    expect(UI_TOGGLE_TRACK_BASE_CLASS).toContain('w-12')
    expect(UI_TOGGLE_TRACK_BASE_CLASS).not.toContain('h-7')
    expect(UI_TOGGLE_TRACK_BASE_CLASS).not.toContain('w-14')
  })

  it('carries a ⌀20 thumb inset 2 on every side', () => {
    // <circle cx="12|36" cy="12" r="10"/> → diameter 20, and (24 − 20) / 2 = 2
    // both vertically and at the resting edge.
    expect(UI_TOGGLE_THUMB_BASE_CLASS).toContain('size-5')
    expect(UI_TOGGLE_THUMB_BASE_CLASS).toContain('top-0.5')
    expect(UI_TOGGLE_THUMB_BASE_CLASS).toContain('left-0.5')
    expect(UI_TOGGLE_THUMB_BASE_CLASS).not.toContain('size-6')
  })

  it('travels 24, the distance between the two exported thumb centres', () => {
    // cx 12 → 36. `translate-x-6` is 1.5rem = 24 at a 16px root; the pre-kit
    // recipes used 28 (step 6) and 30 (step 7).
    expect(UI_TOGGLE_THUMB_ON_CLASS).toBe('translate-x-6')
    expect(UI_TOGGLE_THUMB_OFF_CLASS).toBe('translate-x-0')
    expect(on.thumb).toContain('translate-x-6')
    expect(off.thumb).not.toContain('translate-x-6')
  })

  it('paints toggle/bg/selected #030213 and toggle/bg/unselected #eaeaeb via tokens', () => {
    expect(UI_TOGGLE_TRACK_ON_CLASS).toBe('bg-primary')
    expect(UI_TOGGLE_TRACK_OFF_CLASS).toBe('bg-ink-300')
    expect(on.track).toContain('bg-primary')
    expect(off.track).toContain('bg-ink-300')
    // The two pre-kit off colours are gone: `#ececf0` is not in the kit at all
    // (phase 12 found that out) and `#e5e5e7` never was.
    expect(off.track).not.toContain('ececf0')
    expect(off.track).not.toContain('e5e5e7')
  })

  it('never writes a hex: the kit colours live in app.css as tokens', () => {
    for (const value of [on.track, on.thumb, off.track, off.thumb]) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
    }
  })

  it('is fully rounded — radius/control 1000', () => {
    expect(UI_TOGGLE_TRACK_BASE_CLASS).toContain('rounded-full')
    expect(UI_TOGGLE_THUMB_BASE_CLASS).toContain('rounded-full')
  })

  it('never shrinks: both call sites put it at the end of a flex row', () => {
    expect(on.track).toContain('shrink-0')
    expect(off.track).toContain('shrink-0')
  })

  it('lets the row underneath take the click — the thumb is not a target', () => {
    // Step 7 wraps the toggle in the row's own <button>; a thumb that ate the
    // pointer would make the middle of the control dead.
    expect(UI_TOGGLE_THUMB_BASE_CLASS).toContain('pointer-events-none')
  })
})

describe('embed scale — every length follows the root font-size', () => {
  it('carries no px, vw, vh or em anywhere', () => {
    for (const value of [on.track, on.thumb, off.track, off.thumb]) {
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
      expect(value).not.toMatch(/-\[/)
    }
  })
})

describe('both call sites are on the primitive — no recipe may come back', () => {
  const deliverableCard = read('components/constructor/fields/DeliverableToggleCard.vue')
  const visualComponents = read('views/wizard/VisualComponentsView.vue')

  it('step 6 renders UiToggle instead of the CSS peer checkbox', () => {
    expect(deliverableCard).toContain('UiToggle')
    expect(deliverableCard).not.toContain('peer-checked')
    expect(deliverableCard).not.toContain('sr-only')
    expect(deliverableCard).not.toContain('#ececf0')
  })

  it('step 7 renders the decorative UiToggle instead of nested divs', () => {
    expect(visualComponents).toContain('UiToggle')
    expect(visualComponents).toContain('decorative')
    expect(visualComponents).not.toContain('#e5e5e7')
    expect(visualComponents).not.toContain('left-[30px]')
  })

  it('neither file still hand-draws a 56×28 pill', () => {
    for (const source of [deliverableCard, visualComponents]) {
      expect(source).not.toMatch(/w-14 h-7/)
      expect(source).not.toMatch(/h-7 w-14/)
    }
  })
})
