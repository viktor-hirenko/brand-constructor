import { describe, it, expect } from 'vitest'
import {
  UI_SECTION_CARD_BODY_CLASS,
  UI_SECTION_CARD_BORDER_CLASS,
  UI_SECTION_CARD_CONTENT_CLASS,
  UI_SECTION_CARD_HEADER_CLASS,
  UI_SECTION_CARD_HIGHLIGHTED_CLASS,
  UI_SECTION_CARD_TITLE_CLASS,
  UI_SECTION_CARD_TITLE_GROUP_CLASS,
  resolveUiSectionCardClasses,
} from '@/components/ui/uiSectionCard'

/**
 * Kit Section card — Figma `3761:2273`, drawn at 527 in Final review
 * `5387:91779`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit section card — Figma 3761:2273', () => {
  describe('the box', () => {
    it('is white with a 1px ink-300 border at radius 16', () => {
      // get_variable_defs 3761:2273: section card/bg #ffffff,
      // section card/border #eaeaeb → ink-300, radius/section-card 16.
      // Sampled back off the export of 5387:91779: border (234,234,235).
      const classes = resolveUiSectionCardClasses()
      expect(classes).toContain('bg-white')
      // Stroke inside the box, as the kit draws it (owner 29.09, step 8
      // measured +3 px per card with a CSS border).
      expect(classes).toContain('ring-inset')
      expect(classes).toContain('ring-ink-300')
      expect(classes.split(" ")).not.toContain("border")
      expect(classes).toContain('rounded-2xl')
    })

    it('never carries the pre-kit #EDEDED border', () => {
      // The screen shipped `border-[#EDEDED]`; #ededee left the kit entirely
      // with the --color-ink-300 fix (phase 11's neighbour commit 12a6b20).
      expect(resolveUiSectionCardClasses()).not.toContain('#EDEDED')
      expect(UI_SECTION_CARD_BORDER_CLASS).not.toContain('#')
    })

    it('keeps the border inside the drawn box', () => {
      // Phase 1's footer lesson: without box-border the 1px rim adds 2 to the
      // height and the header stops being 56.
      expect(resolveUiSectionCardClasses()).toContain('box-border')
    })
  })

  describe('the header', () => {
    it('is 56 tall — h-14, the kit Header frame', () => {
      expect(UI_SECTION_CARD_HEADER_CLASS).toContain('h-14')
    })

    it('insets 16 on the title side and 8 on the action side', () => {
      // Action 128×40 at x = 391 of 527 → 527 − 391 − 128 = 8. The Ghost
      // button brings its own 12, which is why the two sides differ.
      expect(UI_SECTION_CARD_HEADER_CLASS).toContain('pl-4')
      expect(UI_SECTION_CARD_HEADER_CLASS).toContain('pr-2')
    })

    it('puts 8 between title, badge and status indicator', () => {
      // Title frame: title · 8 · Badge (x = 47 after a 39-wide title) · 8 ·
      // Status indicator (x = 234 after a 179-wide badge).
      expect(UI_SECTION_CARD_TITLE_GROUP_CLASS).toContain('gap-2')
    })
  })

  describe('the title is 18/24, which is NOT what the plan promised', () => {
    it('is header/s — 18/24 Medium', () => {
      // get_variable_defs on the title text node 3760:1877 returns
      // `header/s` = Inter Medium 18/24. The plan's inventory row claims the
      // kit says 16/24; it does not. `text-lg/6` is 18 over 24.
      expect(UI_SECTION_CARD_TITLE_CLASS).toContain('text-lg/6')
      expect(UI_SECTION_CARD_TITLE_CLASS).toContain('font-medium')
    })

    it('is section card/content/value #1f1f2e → ink-900, not the shipped #0a0a0a', () => {
      // Sampled off the export of 5387:91779: title pixels are (31,31,46).
      expect(UI_SECTION_CARD_TITLE_CLASS).toContain('text-ink-900')
      expect(UI_SECTION_CARD_TITLE_CLASS).not.toContain('#0a0a0a')
    })

    it('sets no letter-spacing — the kit gives 0 on all five type styles', () => {
      // The title kept -0.1504px as open question 7's default answer, and the
      // flip was always going to be a decision rather than a measurement. The
      // owner has made it (divergences row 6).
      expect(UI_SECTION_CARD_TITLE_CLASS).not.toContain('tracking-')
    })
  })

  describe('the content', () => {
    it('pads 16 and puts 16 between properties', () => {
      // Content frame padding 16; drawn properties sit at y = 0 and y = 60
      // against a 44 height, i.e. spacing/16 between them.
      expect(UI_SECTION_CARD_BODY_CLASS).toContain('p-4')
      expect(UI_SECTION_CARD_CONTENT_CLASS).toContain('gap-4')
    })
  })

  describe('highlighted is ours, not the kit’s', () => {
    it('swaps the rim for the amber one review has always drawn', () => {
      const classes = resolveUiSectionCardClasses({ highlighted: true })
      expect(classes).toContain('ring-amber-400')
      expect(classes).toContain('outline-2')
      expect(classes).toContain('outline-amber-200')
    })

    it('does not leave the kit border behind it', () => {
      // Two border-color utilities on one element are resolved by Tailwind's
      // property order, not by the order they are written — so exactly one of
      // them may ever be emitted. That is the whole reason this is a function.
      const classes = resolveUiSectionCardClasses({ highlighted: true })
      expect(classes).not.toContain('ring-ink-300')
      expect(UI_SECTION_CARD_HIGHLIGHTED_CLASS).not.toContain('ring-ink-300')
    })
  })

  describe('lengths follow the embed knob', () => {
    it('writes no px at all any more', () => {
      // "Железные правила адаптива": a px box opts out of html.wizard-embed
      // silently, with no test going red — except this one.
      const everything = [
        resolveUiSectionCardClasses(),
        resolveUiSectionCardClasses({ highlighted: true }),
        UI_SECTION_CARD_HEADER_CLASS,
        UI_SECTION_CARD_TITLE_GROUP_CLASS,
        UI_SECTION_CARD_TITLE_CLASS,
        UI_SECTION_CARD_BODY_CLASS,
        UI_SECTION_CARD_CONTENT_CLASS,
      ].join(' ')
      const pxValues = everything.match(/\[[^\]]*px[^\]]*\]/g) ?? []
      expect(pxValues).toEqual([])
    })
  })
})
