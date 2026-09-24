import { describe, it, expect } from 'vitest'
import {
  UI_LINK_ICON_CLASS,
  UI_LINK_ROOT_CLASS,
  resolveUiLinkClasses,
} from '@/components/ui/uiLink'

/**
 * `UiLink` class map — Figma `4378:8358` (section Link) → frame `4378:8346`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit link — Figma 4378:8358', () => {
  describe('geometry — a link is text, not a box', () => {
    it('sits inline with a 4 gap between glyph and label', () => {
      // get_metadata on 4378:8345: symbol 48×16, Icon 16 at x=0, label at x=20.
      // 16 + 4 = 20, so the gap is spacing/4.
      expect(UI_LINK_ROOT_CLASS).toContain('inline-flex')
      expect(UI_LINK_ROOT_CLASS).toContain('items-center')
      expect(UI_LINK_ROOT_CLASS).toContain('gap-1')
    })

    it('carries no padding, no fill, no border and no underline', () => {
      // The symbol is exactly as tall as its line (16) and as wide as its
      // content (48). Anything that pads or paints it turns it into a button —
      // the kit has a separate Ghost button for that, and it is what the
      // section-card header action is built from.
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/(^|\s)p[xytrbl]?-/)
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/(^|\s)h-/)
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/(^|\s)bg-/)
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/(^|\s)border/)
      expect(UI_LINK_ROOT_CLASS).not.toContain('underline')
    })

    it('draws the leading glyph at 16', () => {
      expect(UI_LINK_ICON_CLASS).toContain('size-4')
      expect(UI_LINK_ICON_CLASS).toContain('shrink-0')
    })

    it('states every length in rem-based utilities, never px', () => {
      // The wizard scales from one root font-size (`app.css` html.wizard-embed);
      // a px length silently opts out and nothing fails. The `tracking`
      // exception this test used to carve out is gone with the tracking.
      const geometry = `${UI_LINK_ROOT_CLASS} ${UI_LINK_ICON_CLASS}`
      expect(geometry).not.toMatch(/\[-?\d*\.?\d+px\]/)
    })
  })

  describe('typography — caption l medium, 14 / 16', () => {
    it('uses the line-height modifier, not bare text-sm', () => {
      // Bare `text-sm` is Tailwind's 14/20; the kit line-height is 16. The
      // `/4` modifier is how `uiButton.ts` spells the same pair.
      expect(UI_LINK_ROOT_CLASS).toContain('text-sm/4')
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/(^|\s)leading-/)
    })

    it('is weight 500', () => {
      expect(UI_LINK_ROOT_CLASS).toContain('font-medium')
    })

    it('sets no letter-spacing — the kit gives 0', () => {
      // All five replaced call sites carried -0.3125px, kept under open
      // question 7's default answer. The owner closed that question the other
      // way and every tracking in the wizard came off (divergences row 6).
      expect(UI_LINK_ROOT_CLASS).not.toContain('tracking-')
    })
  })

  describe('colour — the two states the kit actually draws', () => {
    it('rests on link/default #393947 via the token, not a raw hex', () => {
      // --color-ink-800 is #393947 byte for byte. This component is the first
      // of the kit primitives that needs no hex escape hatch: the #eaeaeb shift
      // recorded in docs/STATE.md "Что дальше" §2 does not touch the link slots.
      expect(UI_LINK_ROOT_CLASS).toContain('text-ink-800')
      expect(UI_LINK_ROOT_CLASS).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    })

    it('hovers to link/hovered #1f1f2e instead of fading out', () => {
      // The five call sites shared `transition-opacity hover:opacity-70`. The
      // kit states a second colour for Hovered; it does not fade the link.
      expect(UI_LINK_ROOT_CLASS).toContain('hover:text-ink-900')
      expect(UI_LINK_ROOT_CLASS).toContain('transition-colors')
      expect(UI_LINK_ROOT_CLASS).not.toContain('hover:opacity-70')
    })

    it('never reaches for the old #373737', () => {
      // REVIEW_PREVIEW_LINK_BUTTON_CLASS painted #373737, which is in neither
      // the kit palette nor our token set.
      expect(UI_LINK_ROOT_CLASS).not.toContain('373737')
    })
  })

  describe('states the kit does not draw but a <button> needs', () => {
    it('keeps a focus ring so unifying does not drop keyboard focus', () => {
      // The kit has no focus state; all five call sites had this exact ring.
      expect(UI_LINK_ROOT_CLASS).toContain('focus-visible:ring-2')
      expect(UI_LINK_ROOT_CLASS).toContain('focus-visible:ring-primary/20')
      expect(UI_LINK_ROOT_CLASS).toContain('rounded-sm')
    })

    it('fades to the kit 50% when disabled and stops hovering', () => {
      expect(UI_LINK_ROOT_CLASS).toContain('disabled:opacity-50')
      expect(UI_LINK_ROOT_CLASS).toContain('disabled:cursor-not-allowed')
      expect(UI_LINK_ROOT_CLASS).toContain('disabled:hover:text-ink-800')
    })
  })

  describe('resolveUiLinkClasses', () => {
    it('hands back the root and the glyph box', () => {
      expect(resolveUiLinkClasses()).toEqual({
        root: UI_LINK_ROOT_CLASS,
        icon: UI_LINK_ICON_CLASS,
      })
    })

    it('has no variants — the kit ships one link, in two states', () => {
      // Default and Hovered are the whole matrix (get_metadata on 4378:8346).
      // If a second recipe ever appears here, it has to come from the kit.
      expect(Object.keys(resolveUiLinkClasses()).sort()).toEqual(['icon', 'root'])
    })
  })
})
