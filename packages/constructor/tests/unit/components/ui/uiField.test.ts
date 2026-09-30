import { describe, it, expect } from 'vitest'
import {
  UI_FIELD_BASE_CLASS,
  UI_FIELD_BORDER_DEFAULT_CLASS,
  UI_FIELD_BORDER_ERROR_CLASS,
  UI_FIELD_CONTROL_AREA_CLASS,
  UI_FIELD_CONTROL_BASE_CLASS,
  UI_FIELD_CONTROL_CLASS,
  UI_FIELD_HINT_TONE_CLASS,
  UI_FIELD_ICON_CLASS,
  UI_FIELD_INNER_LABEL_CLASS,
  UI_FIELD_LABEL_CLASS,
  UI_FIELD_LABEL_OPTIONAL_CLASS,
  UI_FIELD_LABEL_REQUIRED_CLASS,
  UI_FIELD_TYPE_AREA_CLASS,
  UI_FIELD_TYPE_DEFAULT_BARE_CLASS,
  UI_FIELD_TYPE_DEFAULT_CLASS,
  UI_FIELD_TYPE_FLUID_CLASS,
  computeTextareaAutosize,
  resolveUiFieldHintClasses,
  resolveUiFieldSurfaceClasses,
} from '@/components/ui/uiField'

/**
 * Kit input family — Figma section Input `3403:1192`: Input `3424:2287`,
 * Title `3424:1050`, Description `3424:5408`.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

describe('kit input surface — Figma 3424:2287', () => {
  describe('the six states, read one symbol at a time', () => {
    it('Default paints input/bg/default on input/border/default', () => {
      // get_variable_defs 3424:2286 → #f3f3f5 fill, #eaeaeb border.
      const surface = resolveUiFieldSurfaceClasses()
      expect(surface).toContain('bg-ink-200')
      expect(surface).toContain(UI_FIELD_BORDER_DEFAULT_CLASS)
    })

    it('Hovered moves the FILL, not the border', () => {
      // get_variable_defs 3424:2282 returns input/bg/hovered #eaeaeb and
      // input/border/DEFAULT — the border does not move. Every recipe this
      // phase replaced did the opposite (`hover:border-black/20`), so this is
      // the assertion that keeps the old habit from creeping back.
      const surface = resolveUiFieldSurfaceClasses()
      expect(surface).toContain('hover:bg-ink-300')
      expect(surface).not.toContain('hover:border')
    })

    it('Focused takes input/border/focused and drops the hover fill', () => {
      // get_variable_defs 3424:2283 → #f3f3f5 fill, #cacace border. Without the
      // explicit fill a focused field under the pointer would keep the hover
      // colour — a combination the kit does not draw.
      const surface = resolveUiFieldSurfaceClasses()
      expect(surface).toContain('focus-within:border-ink-500')
      expect(surface).toContain('focus-within:bg-ink-200')
    })

    it('Error swaps the border and freezes hover and focus', () => {
      // get_variable_defs 3424:2281 → input/border/error #f4a9aa. The kit has
      // no Error+Hovered and no Error+Focused symbol, and repainting the border
      // would hide the error the field is reporting.
      const surface = resolveUiFieldSurfaceClasses({ invalid: true })
      expect(surface).toContain(UI_FIELD_BORDER_ERROR_CLASS)
      expect(surface).not.toContain(UI_FIELD_BORDER_DEFAULT_CLASS)
      expect(surface).not.toContain('hover:bg-ink-300')
      expect(surface).not.toContain('focus-within:border-ink-500')
    })

    it('Disabled is Default under opacity/50, with no hover', () => {
      // get_variable_defs 3424:2284 returns the Default colours plus
      // opacity/50 — the kit gives Disabled no paint of its own, exactly like
      // Button and Icon button.
      const surface = resolveUiFieldSurfaceClasses({ disabled: true })
      expect(surface).toContain('bg-ink-200')
      expect(surface).toContain(UI_FIELD_BORDER_DEFAULT_CLASS)
      expect(surface).toContain('opacity-50')
      expect(surface).not.toContain('hover:bg-ink-300')
    })

    it('can hold Focused open for a trigger whose popover has the pointer', () => {
      // A date or GEO trigger stays "focused" while the popover it opened is
      // what the pointer is on, and `:focus` cannot say that. The flag also
      // keeps the border decision inside the resolver — adding
      // `border-ink-500` at the call site would put two border-colour
      // utilities on one element, resolved by Tailwind's property order rather
      // than by the class string.
      const surface = resolveUiFieldSurfaceClasses({ focused: true })
      expect(surface).toContain('border-ink-500')
      expect(surface).not.toContain(UI_FIELD_BORDER_DEFAULT_CLASS)
      expect(surface).not.toContain('hover:bg-ink-300')
    })

    it('lets Error outrank a held-open Focused', () => {
      const surface = resolveUiFieldSurfaceClasses({ focused: true, invalid: true })
      expect(surface).toContain(UI_FIELD_BORDER_ERROR_CLASS)
      expect(surface).not.toContain('border-ink-500')
    })

    it('Filled needs no class of its own — it is the value colour', () => {
      // 3424:2285 differs from Default only by input/content/value #1f1f2e,
      // which the control already carries, so there is no `filled` option to
      // get out of sync with the markup.
      expect(UI_FIELD_CONTROL_CLASS).toContain('text-ink-900')
      expect(UI_FIELD_CONTROL_CLASS).toContain('placeholder:text-ink-600')
    })
  })

  describe('geometry — measured on the usage, not on the matrix', () => {
    it('Type = Default is 48 tall with a 16 inset', () => {
      // get_metadata 5562:49261 (New Concept Modal): Input 512×80 =
      // Title 24 + spacing/8 + field 48. Text inset 12 + 4 = 16.
      expect(UI_FIELD_TYPE_DEFAULT_CLASS).toContain('h-12')
      expect(UI_FIELD_TYPE_DEFAULT_CLASS).toContain('px-4')
    })

    it('Type = Area floors at 96 and pads 12 vertically', () => {
      // get_metadata 5562:49194: Input 527×128 = 24 + 8 + 96, text at y=12.
      // min-h-24 is 6rem = 96.
      expect(UI_FIELD_TYPE_AREA_CLASS).toContain('min-h-24')
      // Kit stroke is inside the box: padding + our 1 px border = kit 12 / 16,
      // so three rows land on 96, not 98.
      expect(UI_FIELD_TYPE_AREA_CLASS).toContain('py-[0.6875rem]')
      expect(UI_FIELD_TYPE_AREA_CLASS).toContain('px-[0.9375rem]')
    })

    it('the fluid type floors at the kit 48 and never fixes a height', () => {
      // Ours, for the GEO trigger: a fixed h-12 would clip a wrapped second
      // row of badges.
      expect(UI_FIELD_TYPE_FLUID_CLASS).toContain('min-h-12')
      expect(UI_FIELD_TYPE_FLUID_CLASS).not.toMatch(/(^|\s)h-\d/)
      expect(UI_FIELD_TYPE_FLUID_CLASS).toContain('flex-wrap')
    })

    it('a <select> carrier keeps the box but drops the flex layout', () => {
      // A <select> does not honour display:flex on itself.
      expect(UI_FIELD_TYPE_DEFAULT_BARE_CLASS).toContain('h-12')
      expect(UI_FIELD_TYPE_DEFAULT_BARE_CLASS).not.toContain('flex')
      expect(resolveUiFieldSurfaceClasses({ bare: true })).toContain(
        UI_FIELD_TYPE_DEFAULT_BARE_CLASS
      )
    })

    it('carries radius/input 8 and keeps the border inside the height', () => {
      // `rounded-lg` is Tailwind's 0.5rem = 8. `box-border` is what phase 1
      // learned the hard way: without it the 1px border sits OUTSIDE the box
      // and the kit's 48 ships as 50.
      expect(UI_FIELD_BASE_CLASS).toContain('rounded-lg')
      expect(UI_FIELD_BASE_CLASS).toContain('box-border')
    })

    it('states every length in rem-based utilities, never px', () => {
      // The wizard scales from one root font-size (`app.css` html.wizard-embed);
      // a px length silently opts out of it and no test would go red.
      const geometry = [
        UI_FIELD_BASE_CLASS,
        UI_FIELD_TYPE_DEFAULT_CLASS,
        UI_FIELD_TYPE_AREA_CLASS,
        UI_FIELD_TYPE_FLUID_CLASS,
        UI_FIELD_TYPE_DEFAULT_BARE_CLASS,
        UI_FIELD_CONTROL_CLASS,
        UI_FIELD_ICON_CLASS,
        UI_FIELD_LABEL_CLASS,
      ].join(' ')
      expect(geometry).not.toMatch(/\[-?\d*\.?\d+px\]/)
    })
  })

  describe('a surface that wraps the control vs one that is the control', () => {
    it('defaults to focus-within, because the surface is a wrapper', () => {
      expect(resolveUiFieldSurfaceClasses()).toContain('focus-within:border-ink-500')
    })

    it('uses plain focus when the surface is the focusable element', () => {
      // The raw <select> and the date trigger ARE the control.
      const surface = resolveUiFieldSurfaceClasses({ focusWithin: false })
      expect(surface).toContain('focus:border-ink-500')
      expect(surface).not.toContain('focus-within:border-ink-500')
    })
  })

  describe('Title 3424:1050 and Description 3424:5408', () => {
    it('draws the Title as body/medium 16/24 with a 20 glyph and an 8 gap', () => {
      // get_metadata 3424:1050: Icon 20×20 at x=0, label at x=28 → spacing/8.
      // input/title #1f1f2e, body/medium 16/24.
      expect(UI_FIELD_LABEL_CLASS).toContain('text-base')
      expect(UI_FIELD_LABEL_CLASS).toContain('font-medium')
      expect(UI_FIELD_LABEL_CLASS).toContain('text-ink-900')
      expect(UI_FIELD_LABEL_CLASS).toContain('gap-2')
      expect(UI_FIELD_ICON_CLASS).toContain('size-5')
    })

    it('draws the Description at caption l 14/16, not Tailwind 14/20', () => {
      // Bare `text-sm` is 14/20; the kit line-height is 16. `/4` is how
      // uiButton.ts and uiLink.ts spell the same pair.
      expect(resolveUiFieldHintClasses()).toContain('text-sm/4')
      expect(resolveUiFieldHintClasses()).not.toMatch(/(^|\s)leading-/)
    })

    it('gives Description its two types and nothing else', () => {
      // 3424:5408 has exactly Type = Default (#6f6f7d) and Type = Error (#ce2c31).
      expect(Object.keys(UI_FIELD_HINT_TONE_CLASS).sort()).toEqual(['default', 'error'])
      expect(resolveUiFieldHintClasses('default')).toContain('text-ink-700')
      expect(resolveUiFieldHintClasses('error')).toContain('text-red-content')
    })

    it('spells the inner Label as caption l MEDIUM in input/description', () => {
      // get_variable_defs 3436:4420 → caption/l/medium 14/16, #6f6f7d.
      expect(UI_FIELD_INNER_LABEL_CLASS).toContain('text-sm/4')
      expect(UI_FIELD_INNER_LABEL_CLASS).toContain('font-medium')
      expect(UI_FIELD_INNER_LABEL_CLASS).toContain('text-ink-700')
    })

    it('takes the required and optional marks from kit colours, not new ones', () => {
      // Neither mark exists in the kit; both existed in the tree in two
      // spellings each. They land on input/error and input/description.
      expect(UI_FIELD_LABEL_REQUIRED_CLASS).toContain('text-red-content')
      expect(UI_FIELD_LABEL_OPTIONAL_CLASS).toContain('text-ink-700')
      expect(UI_FIELD_LABEL_OPTIONAL_CLASS).toContain('font-normal')
    })
  })

  describe('no raw hex, and no letter-spacing', () => {
    it('writes every colour as a token utility', () => {
      // uiAlert.ts, uiBadge.ts and uiIconButton.ts carried #eaeaeb as a hex
      // patch until the DP-15258 token fix; the task document forbids
      // re-opening that hole for new components.
      const all = [
        UI_FIELD_BASE_CLASS,
        UI_FIELD_BORDER_DEFAULT_CLASS,
        UI_FIELD_BORDER_ERROR_CLASS,
        UI_FIELD_CONTROL_CLASS,
        UI_FIELD_ICON_CLASS,
        UI_FIELD_INNER_LABEL_CLASS,
        UI_FIELD_LABEL_CLASS,
        resolveUiFieldSurfaceClasses(),
        resolveUiFieldSurfaceClasses({ invalid: true }),
        resolveUiFieldHintClasses('error'),
      ].join(' ')
      expect(all).not.toMatch(/#[0-9a-fA-F]{3,8}/)
      expect(all).not.toMatch(/rgba?\(/)
    })

    it('sets no tracking — the kit puts letterSpacing 0 on all five styles', () => {
      // A deliberate divergence from open question 7: the 21 elements this
      // phase unifies carried THREE different trackings, so "keep the current
      // look" was undefined. Recorded in the Progress log.
      const all = [UI_FIELD_CONTROL_CLASS, UI_FIELD_LABEL_CLASS, UI_FIELD_INNER_LABEL_CLASS].join(
        ' '
      )
      expect(all).not.toContain('tracking-')
    })

    it('keeps the control width out of the base, for the shared GEO box', () => {
      // The GEO search input shares its box with badges and must stay w-auto;
      // two width utilities on one element are resolved by Tailwind's property
      // order, not by the class string.
      expect(UI_FIELD_CONTROL_BASE_CLASS).not.toMatch(/(^|\s)w-/)
      expect(UI_FIELD_CONTROL_CLASS).toContain('w-full')
    })

    it('makes an Area field non-resizable and otherwise identical', () => {
      expect(UI_FIELD_CONTROL_AREA_CLASS).toContain(UI_FIELD_CONTROL_CLASS)
      expect(UI_FIELD_CONTROL_AREA_CLASS).toContain('resize-none')
    })
  })
})

describe('computeTextareaAutosize — the embed-scale fix', () => {
  // The two hand-rolled autosizers this replaces both hard-coded a 24px line.
  // Under the embed scale the root font-size is ~13px, so a line is ~19.5px —
  // these cases are stated at 19.5 on purpose, because that is the number the
  // old code got wrong and no test covered.

  it('floors at rows × line-height + padding', () => {
    expect(computeTextareaAutosize(30, 19.5, 3, 8, 24)).toEqual({
      heightPx: 3 * 19.5 + 24,
      overflowY: 'hidden',
    })
  })

  it('follows the content between the floor and the cap', () => {
    expect(computeTextareaAutosize(120, 19.5, 3, 8, 24)).toEqual({
      heightPx: 120,
      overflowY: 'hidden',
    })
  })

  it('caps at maxRows and hands the overflow to an inner scroll', () => {
    const cap = 8 * 19.5 + 24
    expect(computeTextareaAutosize(cap + 200, 19.5, 3, 8, 24)).toEqual({
      heightPx: cap,
      overflowY: 'auto',
    })
  })

  it('does not scroll at exactly the cap', () => {
    const cap = 8 * 19.5 + 24
    expect(computeTextareaAutosize(cap, 19.5, 3, 8, 24)).toEqual({
      heightPx: cap,
      overflowY: 'hidden',
    })
  })

  it('reproduces the kit Area floor of 96 at the design scale', () => {
    // rows 3 × line 24 + padding 24 = 96 = the Area height every Input
    // instance on 5562:49171 measures.
    expect(computeTextareaAutosize(0, 24, 3, 8, 24).heightPx).toBe(96)
  })
})
