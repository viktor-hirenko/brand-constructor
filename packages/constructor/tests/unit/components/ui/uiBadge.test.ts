import { describe, it, expect } from 'vitest'
import {
  UI_BADGE_ICON_CLASS,
  UI_BADGE_LABEL_CLASS,
  UI_BADGE_ROOT_CLASS,
  UI_BADGE_TONES,
  UI_STATUS_DOT_CLASS,
  resolveUiBadgeClasses,
  type UiBadgeTone,
} from '@/components/ui/uiBadge'
import {
  resolveStatusPillTone,
  type StatusPillTone,
} from '@/components/ui/statusPillBadge'

/**
 * `UiBadge` / `UiStatusDot` class map — Figma `3453:1619` and `3761:1914`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const TONES: UiBadgeTone[] = ['neutral', 'green', 'amber', 'red', 'blue', 'purple']

describe('kit badge — Figma 3453:1619', () => {
  it('carries all six kit colours and no seventh', () => {
    expect(Object.keys(UI_BADGE_TONES).sort()).toEqual([...TONES].sort())
  })

  it('paints each semantic tone from its own bg + content pair', () => {
    // Pulling `surface` instead of `bg`, or `border` instead of `content`, is
    // the mix-up this pins — the alert uses the other two slots of the same
    // four-slot tone, so the two files must not drift into each other.
    expect(UI_BADGE_TONES.green).toContain('bg-green-bg')
    expect(UI_BADGE_TONES.green).toContain('text-green-content')

    expect(UI_BADGE_TONES.amber).toContain('bg-amber-bg')
    expect(UI_BADGE_TONES.amber).toContain('text-amber-content')

    expect(UI_BADGE_TONES.red).toContain('bg-red-bg')
    expect(UI_BADGE_TONES.red).toContain('text-red-content')

    expect(UI_BADGE_TONES.blue).toContain('bg-blue-bg')
    expect(UI_BADGE_TONES.blue).toContain('text-blue-content')

    expect(UI_BADGE_TONES.purple).toContain('bg-purple-bg')
    expect(UI_BADGE_TONES.purple).toContain('text-purple-content')
  })

  it('fills neutral with --color-ink-300, now that it equals the kit #eaeaeb', () => {
    // `badge/bg/neutral` is #eaeaeb. The DP-15258 token fix moved
    // --color-ink-300 from #ededee to that exact value, so the badge rides the
    // token instead of carrying a raw hex escape hatch.
    expect(UI_BADGE_TONES.neutral).toContain('bg-ink-300')
    expect(UI_BADGE_TONES.neutral).not.toContain('#eaeaeb')
    expect(UI_BADGE_TONES.neutral).not.toContain('#ededee')
    expect(UI_BADGE_TONES.neutral).toContain('text-ink-800')
  })

  it('has no border on any tone — the kit badge ships bg + content only', () => {
    // This is what closed open question 8: purple is not missing a border,
    // nobody has one.
    for (const tone of TONES) {
      expect(UI_BADGE_TONES[tone]).not.toMatch(/\bborder\b/)
    }
    expect(UI_BADGE_ROOT_CLASS).not.toMatch(/\bborder\b/)
  })

  it('holds the kit pill geometry: radius 1000, padding 4 + 4', () => {
    // 4 (box) + 16 (caption line) + 4 (box) = the 24 height of the symbols.
    expect(UI_BADGE_ROOT_CLASS).toContain('rounded-full')
    expect(UI_BADGE_ROOT_CLASS).toContain('p-1')
    expect(UI_BADGE_LABEL_CLASS).toContain('px-1')
  })

  it('sets the label in caption m — 12/16, weight 500, one line', () => {
    expect(UI_BADGE_LABEL_CLASS).toContain('text-xs')
    expect(UI_BADGE_LABEL_CLASS).toContain('leading-4')
    expect(UI_BADGE_LABEL_CLASS).toContain('font-medium')
    expect(UI_BADGE_LABEL_CLASS).toContain('whitespace-nowrap')
  })

  it('sizes the icon slots at the kit 16, not the alert 24', () => {
    expect(UI_BADGE_ICON_CLASS).toContain('size-4')
    expect(UI_BADGE_ICON_CLASS).not.toContain('size-6')
  })

  it('keeps every geometry length rem-based — no px at all, tracking included', () => {
    // The wizard scales through one root font-size; a px length here would
    // silently stop following it. The one exemption this file used to carry
    // was `tracking-[-0.3125px]`, and it is gone: the kit states letter-spacing
    // 0 for `caption/m/medium` (`3453:1619`) and the owner closed divergences
    // row 48. The 6px dot is the only px left, and it lives in its own
    // constant rather than in these three.
    for (const value of [UI_BADGE_ROOT_CLASS, UI_BADGE_LABEL_CLASS, UI_BADGE_ICON_CLASS]) {
      expect(value).not.toMatch(/\[[^\]]*\d(?:px)\]/)
    }
  })

  it('sets no letter-spacing — one line, six places on the screen', () => {
    // Country chips on step 1, «Обраний концепт» on step 2, «Обраний пакет» on
    // step 5, the variant name on step 7, and the brief status and the section
    // marker on step 8 all render this one class.
    expect(UI_BADGE_LABEL_CLASS).not.toContain('tracking-')
  })

  it('resolves a tone into root + label + icon, tone last so it wins', () => {
    const classes = resolveUiBadgeClasses('amber')
    expect(classes.root.startsWith(UI_BADGE_ROOT_CLASS)).toBe(true)
    expect(classes.root).toContain(UI_BADGE_TONES.amber)
    expect(classes.label).toBe(UI_BADGE_LABEL_CLASS)
    expect(classes.icon).toBe(UI_BADGE_ICON_CLASS)
  })

  it('defaults to neutral', () => {
    expect(resolveUiBadgeClasses().root).toContain(UI_BADGE_TONES.neutral)
  })
})

describe('kit status indicator — Figma 3761:1914', () => {
  it('is a 6×6 round dot in status indicator/info', () => {
    expect(UI_STATUS_DOT_CLASS).toContain('size-[6px]')
    expect(UI_STATUS_DOT_CLASS).toContain('rounded-full')
    // #3a5bc7 — the same value as badge/content/blue, so it rides that token.
    expect(UI_STATUS_DOT_CLASS).toContain('bg-blue-content')
  })

  it('no longer uses Tailwind blue-500 #3b82f6 — open question 3', () => {
    expect(UI_STATUS_DOT_CLASS).not.toContain('bg-blue-500')
  })
})

describe('StatusPillBadge adapter keeps its vocabulary on kit paint', () => {
  const PILL_TONES: StatusPillTone[] = [
    'brief-submitted',
    'brief-revision',
    'brief-approved',
    'section-attention',
  ]

  it('maps all four brief tones onto kit tones', () => {
    expect(resolveStatusPillTone('brief-submitted').tone).toBe('blue')
    expect(resolveStatusPillTone('brief-revision').tone).toBe('amber')
    expect(resolveStatusPillTone('brief-approved').tone).toBe('green')
    expect(resolveStatusPillTone('section-attention').tone).toBe('amber')
  })

  it('collapses the two near-identical ambers into one tone', () => {
    // #916c00 on the revision badge vs #936c00 on the section badge — two
    // hand-mixed values two units apart, now both `badge/content/amber`.
    expect(resolveStatusPillTone('brief-revision').tone).toBe(
      resolveStatusPillTone('section-attention').tone
    )
  })

  it('leaves the attention marker only on the section tone', () => {
    expect(resolveStatusPillTone('section-attention').leading).toBe('attention')
    for (const tone of PILL_TONES.filter((t) => t !== 'section-attention')) {
      expect(resolveStatusPillTone(tone).leading).toBe('none')
    }
  })

  it('resolves every tone to a real UiBadge tone', () => {
    for (const tone of PILL_TONES) {
      expect(TONES).toContain(resolveStatusPillTone(tone).tone)
    }
  })
})
