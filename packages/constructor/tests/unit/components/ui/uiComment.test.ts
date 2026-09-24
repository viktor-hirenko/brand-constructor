import { describe, it, expect } from 'vitest'
import {
  UI_COMMENT_BODY_CLASS,
  UI_COMMENT_CLASS,
  UI_COMMENT_LABEL_CLASS,
  UI_COMMENT_UNRESOLVED_CLASS,
  UI_COMMENT_VALUE_CLASS,
  resolveUiCommentClasses,
} from '@/components/ui/uiComment'

/**
 * Kit Comment — Figma `3439:1309`, Types Default / Unresolved / Resolved.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit comment — Figma 3439:1309', () => {
  describe('the box', () => {
    it('fills with comment/bg/default #f9f9fb → ink-100', () => {
      // Sampled off the export of 3439:1309: (249,249,251). The same value
      // phase 11 added to the scale for List item's hover, precisely because
      // this component was going to need it.
      expect(resolveUiCommentClasses()).toContain('bg-ink-100')
    })

    it('never writes the four hand-rolled colours the kit does not contain', () => {
      const everything = [
        resolveUiCommentClasses(),
        resolveUiCommentClasses({ unresolved: true }),
        UI_COMMENT_LABEL_CLASS,
        UI_COMMENT_VALUE_CLASS,
      ]
        .join(' ')
        .toLowerCase()
      // rgba(217,217,217,0.2) and rgba(197,197,200,0.2) fills, #5b5b62 label,
      // #3d3d3d value — none of them appear anywhere in the kit.
      expect(everything).not.toContain('217,217,217')
      expect(everything).not.toContain('197,197,200')
      expect(everything).not.toContain('5b5b62')
      expect(everything).not.toContain('3d3d3d')
    })

    it('rounds to radius/input 8 — the box is an Input', () => {
      expect(resolveUiCommentClasses()).toContain('rounded-lg')
    })

    it('insets 16 across and 12 down, the Input arithmetic phase 11 measured', () => {
      // Text frame at 12/12 plus 4 inside the text frame horizontally.
      // Measured back off the export of 5387:91779: box top 192, first label
      // pixel at y = 207 and x = 33 against a box left edge of 16.
      expect(resolveUiCommentClasses()).toContain('px-4')
      expect(resolveUiCommentClasses()).toContain('py-3')
    })

    it('puts spacing/4 under the label and spacing/12 above the footer', () => {
      expect(UI_COMMENT_BODY_CLASS).toContain('gap-1')
      expect(UI_COMMENT_CLASS).toContain('gap-3')
    })
  })

  describe('Type = Unresolved', () => {
    it('draws a 2px rail in comment/border/accent #3a5bc7 → blue-content', () => {
      // Both numbers off the export, not off a name: the rendered PNG of
      // `3439:1309` has exactly two columns of (58,91,199) at the left edge of
      // the Unresolved symbol and none at the other two. The screen shipped
      // #4882ff, which the kit does not contain.
      const classes = resolveUiCommentClasses({ unresolved: true })
      expect(classes).toContain('border-l-2')
      expect(classes).toContain('border-blue-content')
      expect(classes.toLowerCase()).not.toContain('4882ff')
    })

    it('gives the rail its 2px back so the text does not move', () => {
      // The kit keeps its text frame at x = 12 in ALL THREE symbols, so the
      // rail is drawn ON the box, not beside it. A bare `border-l-2` pushes
      // the value 2px right the moment a comment becomes unresolved — which is
      // what the screen did.
      expect(UI_COMMENT_UNRESOLVED_CLASS).toContain('pl-[calc(1rem-2px)]')
    })

    it('is absent from Default and Resolved', () => {
      expect(resolveUiCommentClasses()).not.toContain('border-l-2')
      expect(resolveUiCommentClasses({ unresolved: false })).not.toContain('border-blue-content')
    })
  })

  describe('typography', () => {
    it('sets the label at caption/l/medium 14/16 in comment/content/label', () => {
      expect(UI_COMMENT_LABEL_CLASS).toContain('text-sm/4')
      expect(UI_COMMENT_LABEL_CLASS).toContain('font-medium')
      expect(UI_COMMENT_LABEL_CLASS).toContain('text-ink-700')
    })

    it('sets the value at body/regular 16/24 in comment/content/value', () => {
      expect(UI_COMMENT_VALUE_CLASS).toContain('text-base')
      expect(UI_COMMENT_VALUE_CLASS).toContain('font-normal')
      expect(UI_COMMENT_VALUE_CLASS).toContain('text-ink-900')
    })

    it('keeps author line breaks — every comment carrier did', () => {
      expect(UI_COMMENT_VALUE_CLASS).toContain('whitespace-pre-line')
    })

    it('sets no letter-spacing on either half — the kit gives 0', () => {
      // Both halves drew -0.1504px under open question 7's default answer,
      // keep the current look. The owner closed that question the other way
      // (divergences row 6), so the kit's 0 now holds here too.
      expect(UI_COMMENT_LABEL_CLASS).not.toContain('tracking-')
      expect(UI_COMMENT_VALUE_CLASS).not.toContain('tracking-')
    })
  })

  describe('lengths follow the embed knob', () => {
    it('writes px only where the rules allow it', () => {
      // One exception left, documented in "Железные правила адаптива": the
      // hairline rail (a rem border turns to grey mush at an 11px root). The
      // tracking exception is gone with the tracking itself.
      const everything = [
        resolveUiCommentClasses({ unresolved: true }),
        UI_COMMENT_BODY_CLASS,
        UI_COMMENT_LABEL_CLASS,
        UI_COMMENT_VALUE_CLASS,
      ].join(' ')
      const pxValues = everything.match(/\[[^\]]*px[^\]]*\]/g) ?? []
      expect(pxValues).toEqual(['[calc(1rem-2px)]'])
    })
  })
})
