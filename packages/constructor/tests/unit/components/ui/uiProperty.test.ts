import { describe, it, expect } from 'vitest'
import {
  UI_PROPERTY_CONTENT_GAP,
  UI_PROPERTY_ICON_CLASS,
  UI_PROPERTY_LABEL_CLASS,
  UI_PROPERTY_ROW_ALIGNMENT,
  UI_PROPERTY_VALUE_CLASS,
  resolveUiPropertyContentClasses,
  resolveUiPropertyRowClasses,
  type UiPropertyType,
} from '@/components/ui/uiProperty'

/**
 * Kit Property — Figma `3761:2281`, four symbols.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const ALL_TYPES: UiPropertyType[] = [
  'icon-label-value',
  'icon-value',
  'label-value',
  'label-preview',
]

describe('kit property — Figma 3761:2281', () => {
  describe('the label→value gap is NOT one number', () => {
    /**
     * This is the finding the plan does not contain, and the reason the gap is
     * a lookup rather than a constant.
     *
     *   Icon + Label + Value `3760:2324` — value at y = 20 against a 16 label
     *                                       → 4, and get_variable_defs returns
     *                                         spacing/4 alongside spacing/8
     *   Label + Value        `4378:8011` — value at y = 24 → 8, and the symbol
     *                                       returns spacing/8 and nothing else
     *   Label + Preview      `4131:8340` — concept card at y = 24 → 8
     */
    it('is 4 on the icon-bearing pair', () => {
      expect(UI_PROPERTY_CONTENT_GAP['icon-label-value']).toBe('gap-1')
      expect(UI_PROPERTY_CONTENT_GAP['icon-value']).toBe('gap-1')
    })

    it('is 8 on the two label-first types', () => {
      expect(UI_PROPERTY_CONTENT_GAP['label-value']).toBe('gap-2')
      expect(UI_PROPERTY_CONTENT_GAP['label-preview']).toBe('gap-2')
    })

    it('reaches the rendered class, not just the table', () => {
      expect(resolveUiPropertyContentClasses('icon-label-value')).toContain('gap-1')
      expect(resolveUiPropertyContentClasses('label-value')).toContain('gap-2')
    })
  })

  describe('alignment', () => {
    it('centres Icon + Value, because the kit does', () => {
      // `3761:2282`: the icon sits at y = 2 against a 24 line (20 tall), and
      // the trailing Link at y = 4 (16 tall) — both optically centred.
      expect(UI_PROPERTY_ROW_ALIGNMENT['icon-value']).toBe('items-center')
    })

    it('hangs every other type from the top', () => {
      expect(UI_PROPERTY_ROW_ALIGNMENT['icon-label-value']).toBe('items-start')
      expect(UI_PROPERTY_ROW_ALIGNMENT['label-value']).toBe('items-start')
      expect(UI_PROPERTY_ROW_ALIGNMENT['label-preview']).toBe('items-start')
    })

    it('puts 8 between the icon and the text, on every type', () => {
      // 28 − 20 in both icon-bearing symbols. The label-first types have no
      // icon to space, and carrying the same row gap costs nothing.
      for (const type of ALL_TYPES) {
        expect(resolveUiPropertyRowClasses(type)).toContain('gap-2')
      }
    })
  })

  describe('colours are the kit’s, read off the export', () => {
    it('paints the glyph the same #6f6f7d as the label', () => {
      // Phase 12's chevron wore the wrong token because one node hands back
      // several icon colours. So this was sampled from the rendered PNG of
      // `5387:91779`: glyph pixels are (111,111,125) — identical to the label,
      // i.e. section card/content/label, not a darker content colour.
      expect(UI_PROPERTY_ICON_CLASS).toContain('text-ink-700')
      expect(UI_PROPERTY_LABEL_CLASS).toContain('text-ink-700')
    })

    it('sizes the glyph 20, the kit’s Icon instance', () => {
      expect(UI_PROPERTY_ICON_CLASS).toContain('size-5')
      expect(UI_PROPERTY_ICON_CLASS).toContain('shrink-0')
    })

    it('never writes #5B5B62, which the kit does not contain', () => {
      // Open question 2, resolved by its default: 52 call sites carried it.
      const everything = [UI_PROPERTY_ICON_CLASS, UI_PROPERTY_LABEL_CLASS, UI_PROPERTY_VALUE_CLASS]
        .join(' ')
        .toLowerCase()
      expect(everything).not.toContain('5b5b62')
      expect(everything).not.toContain('1a1a1a')
    })
  })

  describe('typography', () => {
    it('sets the label at caption/l/medium 14/16', () => {
      expect(UI_PROPERTY_LABEL_CLASS).toContain('text-sm/4')
      expect(UI_PROPERTY_LABEL_CLASS).toContain('font-medium')
    })

    it('sets the value at body/regular 16/24 in ink-900', () => {
      expect(UI_PROPERTY_VALUE_CLASS).toContain('text-base')
      expect(UI_PROPERTY_VALUE_CLASS).toContain('text-ink-900')
    })

    it('keeps the tracking each half already had (open question 7 default)', () => {
      // The kit sets 0 on both. Review drew -0.1504px on every value and none
      // on any label; "keep the current look" is honourable here, so both
      // halves are pinned rather than quietly unified.
      expect(UI_PROPERTY_VALUE_CLASS).toContain('tracking-[-0.1504px]')
      expect(UI_PROPERTY_LABEL_CLASS).not.toContain('tracking-')
    })
  })

  describe('lengths follow the embed knob', () => {
    it('writes no px anywhere but the value tracking', () => {
      const everything = [
        ...ALL_TYPES.map(resolveUiPropertyRowClasses),
        ...ALL_TYPES.map(resolveUiPropertyContentClasses),
        UI_PROPERTY_ICON_CLASS,
        UI_PROPERTY_LABEL_CLASS,
        UI_PROPERTY_VALUE_CLASS,
      ].join(' ')
      const pxValues = everything.match(/\[[^\]]*px[^\]]*\]/g) ?? []
      expect(pxValues).toEqual(['[-0.1504px]'])
    })
  })
})
