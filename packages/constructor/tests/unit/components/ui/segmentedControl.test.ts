import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  SEGMENTED_CONTROL_ROOT_CLASS,
  SEGMENT_BASE_CLASS,
  SEGMENT_ACTIVE_CLASS,
  SEGMENT_INACTIVE_CLASS,
  SEGMENT_DISABLED_CLASS,
  resolveSegmentedControlClasses,
  resolveSegmentState,
} from '@/components/ui/segmentedControl'

/**
 * `SegmentedControl` class map — Figma `3706:6076` over `3706:5980`,
 * DP-15258 phase 17.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 *
 * The geometry is measured: `get_metadata` on the drawn step 2 instance
 * `4016:7708` gives the control 219×40 with two segments 32 tall, and
 * `get_variable_defs` on `3706:5980` gives the four content colours plus
 * `radius/segment` 6 and `spacing/4` / `spacing/8`.
 *
 * Verified to fail: put `#ececf0` back on the box, take the padding back to
 * `p-0.5`, shrink the segment to `py-1.5`, or give Hovered a white plate.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const classes = resolveSegmentedControlClasses()

describe('kit segmented control — Figma 3706:6076', () => {
  it('is radius 8 with spacing/4 padding, so the control stands 40', () => {
    // 4 + 32 + 4 = 40, the height of the drawn instance 4016:7708.
    expect(SEGMENTED_CONTROL_ROOT_CLASS).toContain('rounded-lg')
    expect(SEGMENTED_CONTROL_ROOT_CLASS).toContain('p-1')
    expect(SEGMENTED_CONTROL_ROOT_CLASS).not.toContain('p-0.5')
  })

  it('paints segmented-control/bg #eaeaeb through the token, not #ececf0', () => {
    expect(SEGMENTED_CONTROL_ROOT_CLASS).toContain('bg-ink-300')
    // #ececf0 is not in the kit at all — phase 12 found that out on the
    // accordion header hover and removed it there.
    expect(SEGMENTED_CONTROL_ROOT_CLASS).not.toContain('ececf0')
  })

  it('draws the segment 32 tall: radius 6, 12 horizontal and 8 vertical padding', () => {
    expect(SEGMENT_BASE_CLASS).toContain('rounded-md')
    expect(SEGMENT_BASE_CLASS).toContain('px-3')
    expect(SEGMENT_BASE_CLASS).toContain('py-2')
    expect(SEGMENT_BASE_CLASS).not.toContain('py-1.5')
    expect(SEGMENT_BASE_CLASS).not.toContain('px-2 ')
  })

  it('sets the label to caption/l 14/16 weight 400 with no letter-spacing', () => {
    expect(SEGMENT_BASE_CLASS).toContain('text-sm/4')
    expect(SEGMENT_BASE_CLASS).toContain('font-normal')
    // The kit gives letterSpacing 0 on caption/l; this element is rewritten
    // here, the same call phases 11 and 12 made for fields and the accordion.
    expect(SEGMENT_BASE_CLASS).not.toContain('tracking-')
  })

  it('gives Active a white plate, the kit shadow and #1f1f2e ink', () => {
    expect(SEGMENT_ACTIVE_CLASS).toContain('bg-white')
    expect(SEGMENT_ACTIVE_CLASS).toContain('text-ink-900')
    expect(SEGMENT_ACTIVE_CLASS).toContain('shadow-[0_8px_5px_rgba(0,0,0,0.1)]')
    // `shadow-lg` is Tailwind's own stack, not the kit's single drop shadow.
    expect(SEGMENT_ACTIVE_CLASS).not.toContain('shadow-lg')
  })

  it('leaves Hovered without a plate — the kit only darkens the label', () => {
    expect(SEGMENT_INACTIVE_CLASS).toContain('text-ink-700')
    expect(SEGMENT_INACTIVE_CLASS).toContain('hover:text-ink-900')
    expect(SEGMENT_INACTIVE_CLASS).not.toContain('hover:bg-')
  })

  it('has a Disabled state at all, and paints it #95959d', () => {
    expect(SEGMENT_DISABLED_CLASS).toContain('text-ink-600')
    expect(SEGMENT_DISABLED_CLASS).toContain('cursor-not-allowed')
    expect(SEGMENT_DISABLED_CLASS).not.toContain('bg-white')
  })

  it('lets Disabled win over selected — the kit plate is not drawn there', () => {
    expect(resolveSegmentState({ selected: true, disabled: false })).toBe('active')
    expect(resolveSegmentState({ selected: false, disabled: false })).toBe('inactive')
    expect(resolveSegmentState({ selected: true, disabled: true })).toBe('disabled')
    expect(classes.segment('disabled')).not.toContain('bg-white')
  })

  it('never writes a hex: the kit colours live in app.css as tokens', () => {
    for (const value of [
      classes.root,
      classes.segment('active'),
      classes.segment('inactive'),
      classes.segment('disabled'),
    ]) {
      expect(value).not.toMatch(/\[#[0-9a-fA-F]{3,8}\]/)
    }
  })
})

describe('embed scale — every box follows the root font-size', () => {
  it('carries no px box, vw, vh or em; only the shadow offset stays in px', () => {
    for (const value of [
      classes.root,
      classes.segment('active'),
      classes.segment('inactive'),
      classes.segment('disabled'),
    ]) {
      const withoutShadow = value.replace(/shadow-\[[^\]]+\]/g, '')
      expect(withoutShadow).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
    }
  })
})

describe('the component is on the map — no recipe may come back', () => {
  const component = read('components/ui/SegmentedControl.vue')

  it('renders through the resolver instead of inline classes', () => {
    expect(component).toContain('resolveSegmentedControlClasses')
    expect(component).toContain('resolveSegmentState')
    expect(component).not.toContain('#ececf0')
    expect(component).not.toContain('#6b6b6b')
    expect(component).not.toContain('#030213')
  })

  it('honours the disabled option on the segment it belongs to', () => {
    expect(component).toContain(':disabled="isDisabled(option)"')
  })
})
