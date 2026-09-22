import { describe, it, expect } from 'vitest'
import * as accordion from '@/components/ui/uiAccordion'
import {
  UI_ACCORDION_CHEVRON_CLASS,
  UI_ACCORDION_CONTENT_CLASS,
  UI_ACCORDION_HEADER_CLASS,
  UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS,
  UI_ACCORDION_HEADER_INTERACTIVE_CLASS,
  UI_ACCORDION_HEADER_TITLE_CLASS,
  UI_ACCORDION_ICON_SIZE_CLASS,
  UI_ACCORDION_ITEM_CLASS,
  UI_ACCORDION_LIST_CLASS,
  UI_ACCORDION_OPTION_CLASS,
  UI_ACCORDION_OPTION_DESCRIPTION_CLASS,
  UI_ACCORDION_OPTION_ICON_CLASS,
  UI_ACCORDION_OPTION_INTERACTIVE_CLASS,
  UI_ACCORDION_OPTION_PREVIEW_CLASS,
  UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS,
  UI_ACCORDION_OPTION_SELECTED_CLASS,
  UI_ACCORDION_OPTION_TITLE_CLASS,
  resolveUiAccordionHeaderClasses,
  resolveUiAccordionListClasses,
  resolveUiAccordionOptionClasses,
} from '@/components/ui/uiAccordion'

/**
 * Kit Accordion — section `3839:12607`, row `3839:12381`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit accordion — Figma 3839:12607 / 3839:12381', () => {
  describe('the eight numbers the skeleton has to share', () => {
    /**
     * These are the values `VisualComponentsAccordionSkeleton` used to carry as
     * a second hand-typed copy. Both sides now import them from
     * `uiAccordion.ts`; this block is what stops someone inlining one of them
     * back into either file, which is how the two drifted before.
     */
    it('1 — list pitch is gap-2, the drawn screen 64 minus the 56 box', () => {
      expect(UI_ACCORDION_LIST_CLASS).toContain('gap-2')
      expect(UI_ACCORDION_LIST_CLASS).toContain('flex-col')
    })

    it('2, 3, 4 — the section box: 1px ink-300 border, radius 16, white fill', () => {
      // get_variable_defs 3839:12604: accordion/border/default #eaeaeb → ink-300,
      // accordion/bg/default #ffffff, radius/accordion 16 → rounded-2xl.
      expect(UI_ACCORDION_ITEM_CLASS).toContain('border-ink-300')
      expect(UI_ACCORDION_ITEM_CLASS).toContain('rounded-2xl')
      expect(UI_ACCORDION_ITEM_CLASS).toContain('bg-white')
      // box-border keeps the border inside the 56 — phase 1's footer lesson.
      expect(UI_ACCORDION_ITEM_CLASS).toContain('box-border')
    })

    it('3 — the radius is the kit 16, never the 10 the screen shipped with', () => {
      expect(UI_ACCORDION_ITEM_CLASS).not.toContain('rounded-[10px]')
      expect(UI_ACCORDION_ITEM_CLASS).not.toContain('rounded-xl ')
    })

    it('5, 6 — header inset is spacing/16 on all four sides', () => {
      // 16 + 24 + 16 = 56, the height get_metadata 3839:12607 reports.
      expect(UI_ACCORDION_HEADER_CLASS).toContain('p-4')
      expect(UI_ACCORDION_HEADER_CLASS).not.toContain('py-3')
      expect(UI_ACCORDION_HEADER_CLASS).toContain('gap-2')
    })

    it('7 — header content is 24 tall on both sides of the swap', () => {
      // The real header derives the 24 from body/medium 16/24; the skeleton's
      // bars have no line box and take it as a height. The two cannot be the
      // same class, so this is where they are pinned together: `text-base` is
      // Tailwind's 16/24 and `h-6` is 24. Change one without the other and the
      // loading list steps up or down when the real accordion arrives.
      expect(UI_ACCORDION_HEADER_TITLE_CLASS).toContain('text-base')
      expect(UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS).toBe('h-6')
    })

    it('8 — header icons are 16, not the 20 the code drew', () => {
      expect(UI_ACCORDION_ICON_SIZE_CLASS).toBe('size-4')
      expect(UI_ACCORDION_CHEVRON_CLASS).toContain(UI_ACCORDION_ICON_SIZE_CLASS)
      expect(UI_ACCORDION_CHEVRON_CLASS).not.toContain('size-5')
    })
  })

  describe('the three values the kit has the other way round', () => {
    it('the section is white and hovers to accordion/bg/hovered #f3f3f5', () => {
      // The code painted the header #f3f3f5 always and hovered it to #ececf0,
      // which is in no kit section.
      expect(UI_ACCORDION_ITEM_CLASS).toContain('bg-white')
      expect(resolveUiAccordionHeaderClasses()).toContain('hover:bg-ink-200')
      expect(UI_ACCORDION_HEADER_INTERACTIVE_CLASS).not.toContain('ececf0')
    })

    it('Disabled is opacity/50, not the 40 the delegate branch used', () => {
      const classes = resolveUiAccordionListClasses({ disabled: true })
      expect(classes).toContain('opacity-50')
      expect(classes).not.toContain('opacity-40')
      expect(classes).toContain('pointer-events-none')
    })

    it('a disabled section drops the hover fill with it', () => {
      expect(resolveUiAccordionHeaderClasses({ disabled: true })).not.toContain('hover:bg-ink-200')
    })

    it('the row carries its border in every state so picking it cannot shift it', () => {
      // The kit draws Default with no border and Selected with a 1px one. Taken
      // literally that moves the row by a pixel when it is picked, so Default
      // keeps a transparent border instead — the one deliberate divergence.
      expect(UI_ACCORDION_OPTION_CLASS).toContain('border border-transparent')
      expect(resolveUiAccordionOptionClasses({ selected: true })).toContain('border-primary')
    })
  })

  describe('the row — kit 3839:12381', () => {
    it('is 56 tall: a 48 preview under py-1', () => {
      expect(UI_ACCORDION_OPTION_CLASS).toContain('py-1')
      expect(UI_ACCORDION_OPTION_PREVIEW_CLASS).toContain('size-12')
    })

    it('insets pl 4 / pr 16 and spaces the preview from the text by 16', () => {
      expect(UI_ACCORDION_OPTION_CLASS).toContain('pl-1')
      expect(UI_ACCORDION_OPTION_CLASS).toContain('pr-4')
      expect(UI_ACCORDION_OPTION_CLASS).toContain('gap-4')
      // The code had pr-6 (24) and gap-3 (12); neither is in the kit.
      expect(UI_ACCORDION_OPTION_CLASS).not.toContain('pr-6')
      expect(UI_ACCORDION_OPTION_CLASS).not.toContain('gap-3')
    })

    it('draws the preview tile at radius/small-preview 12 on bg/alt-2', () => {
      expect(UI_ACCORDION_OPTION_PREVIEW_CLASS).toContain('rounded-xl')
      expect(UI_ACCORDION_OPTION_PREVIEW_CLASS).toContain('bg-ink-200')
    })

    it('sets the letter in header/s 18/24, not the 24/32 the code used', () => {
      expect(UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS).toContain('text-lg/6')
      expect(UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS).toContain('text-ink-600')
      expect(UI_ACCORDION_OPTION_PREVIEW_LETTER_CLASS).not.toContain('text-2xl')
    })

    it('sets both texts in caption/l 14/16 — bare text-sm would be 14/20', () => {
      expect(UI_ACCORDION_OPTION_TITLE_CLASS).toContain('text-sm/4')
      expect(UI_ACCORDION_OPTION_DESCRIPTION_CLASS).toContain('text-sm/4')
      expect(UI_ACCORDION_OPTION_DESCRIPTION_CLASS).toContain('text-ink-700')
    })

    it('keeps the Selected check at 20 while the header icons are 16', () => {
      // The two sizes are genuinely different in the kit: 3839:12409 is 20,
      // the header's chevron and eye are 16.
      expect(UI_ACCORDION_OPTION_ICON_CLASS).toContain('size-5')
    })

    it('hovers to accordion/bg/hovered and drops it when disabled', () => {
      expect(resolveUiAccordionOptionClasses()).toContain(UI_ACCORDION_OPTION_INTERACTIVE_CLASS)
      const disabled = resolveUiAccordionOptionClasses({ disabled: true })
      expect(disabled).toContain('opacity-50')
      expect(disabled).not.toContain('hover:bg-ink-200')
    })

    it('keeps Selected readable while disabled', () => {
      const classes = resolveUiAccordionOptionClasses({ selected: true, disabled: true })
      expect(classes).toContain(UI_ACCORDION_OPTION_SELECTED_CLASS)
      expect(classes).toContain('opacity-50')
    })
  })

  describe('the content frame', () => {
    it('insets spacing/12 and spaces rows by spacing/4', () => {
      // The drawn screen puts rows on a 60 pitch inside an open section
      // (56 + 4) starting 12 from the top — get_metadata 5382:36912.
      expect(UI_ACCORDION_CONTENT_CLASS).toContain('p-3')
      expect(UI_ACCORDION_CONTENT_CLASS).toContain('gap-1')
      // The code had space-y-2, i.e. 8.
      expect(UI_ACCORDION_CONTENT_CLASS).not.toContain('gap-2')
    })
  })

  describe('adaptive rules', () => {
    const stringExports = Object.entries(accordion).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )

    it('exports no raw hex — every colour lands on a token', () => {
      // uiAlert.ts, uiBadge.ts and uiIconButton.ts each carried #eaeaeb as a
      // patch until the token fix; the task document forbids reopening that.
      for (const [name, value] of stringExports) {
        expect(value, `${name} carries a raw hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      }
    })

    it('expresses no length in px except letter-spacing', () => {
      // "Железные правила адаптива": the wizard is scaled by one root
      // font-size, and a px box opts out of it with nothing going red.
      // `tracking-[…px]` is the documented exception and is what open
      // question 7 asks us to keep here.
      for (const [name, value] of stringExports) {
        const withoutTracking = value.replace(/tracking-\[[^\]]*\]/g, '')
        expect(withoutTracking, `${name} carries a px length`).not.toContain('px]')
      }
    })

    it('keeps the letter-spacing the screen already had — open question 7', () => {
      // Unlike the input family in phase 11, the current look here is defined:
      // the header title is -0.31px and both row texts are -0.15px. The kit
      // sets 0, and the divergence is recorded in the task document.
      expect(UI_ACCORDION_HEADER_TITLE_CLASS).toContain('tracking-[-0.31px]')
      expect(UI_ACCORDION_OPTION_TITLE_CLASS).toContain('tracking-[-0.15px]')
      expect(UI_ACCORDION_OPTION_DESCRIPTION_CLASS).toContain('tracking-[-0.15px]')
    })
  })
})
