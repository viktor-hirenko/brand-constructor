import { describe, it, expect } from 'vitest'
import {
  UI_MODAL_BACKDROP_CLASS,
  UI_MODAL_BODY_CLASS,
  UI_MODAL_CLOSE_CLASS,
  UI_MODAL_CLOSE_ICON_CLASS,
  UI_MODAL_DIALOG_CLASS,
  UI_MODAL_FOOTER_CLASS,
  UI_MODAL_HEADER_CLASS,
  UI_MODAL_OVERLAY_CLASS,
  UI_MODAL_SIZE,
  UI_MODAL_TITLE_CLASS,
  resolveUiModalClasses,
  type UiModalSize,
} from '@/components/ui/uiModal'

/**
 * `UiModal` class map — DP-15258 phase 6.
 *
 * The kit has no modal component, but on 2026-09-15 the designer published five
 * frames that draw one: `5562:49171`, `5562:49268`, `5562:49684`, `5562:49771`,
 * `5562:48269`. The numbers below are read off those frames; the two that break
 * silently — `max-h-[85vh]` (a long modal has to scroll inside the admin panel,
 * not run off it) and the rem-only interior — are ours and are pinned here too.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the class
 * decision is a pure function and this file is the only guard on it.
 */

const SIZES: UiModalSize[] = ['sm', 'md']

describe('wizard modal shell — DP-15258 phase 6', () => {
  it('keeps the 85vh ceiling that makes a long modal scroll', () => {
    // The one place `vh` is legal in the wizard: inside `Teleport to="body"`,
    // where the shell's transform no longer applies. Dropping it lets a long
    // modal grow past the admin panel and the buttons leave the screen.
    expect(UI_MODAL_DIALOG_CLASS).toContain('max-h-[85vh]')
  })

  it('makes the body the scrolling part, not the dialog', () => {
    expect(UI_MODAL_BODY_CLASS).toContain('overflow-y-auto')
    expect(UI_MODAL_BODY_CLASS).toContain('flex-1')
    // Without min-h-0 a flex child refuses to shrink under its content and the
    // overflow never engages — the dialog grows past max-h instead.
    expect(UI_MODAL_BODY_CLASS).toContain('min-h-0')
    expect(UI_MODAL_DIALOG_CLASS).toContain('flex-col')
    expect(UI_MODAL_DIALOG_CLASS).not.toContain('overflow-y-auto')
  })

  it('clips the corners so the scrolling body respects radius 16', () => {
    expect(UI_MODAL_DIALOG_CLASS).toContain('rounded-2xl')
    expect(UI_MODAL_DIALOG_CLASS).toContain('overflow-hidden')
  })

  it('offers exactly two widths and no third', () => {
    // 560 is what all five drawn frames use for a brief form; 450 is the
    // confirmation width, which the design never drew. A `lg` 672 existed for
    // one deploy and is gone: the concept and external naming forms were the
    // only ones on it and the frames put them at 560.
    expect(Object.keys(UI_MODAL_SIZE).sort()).toEqual([...SIZES].sort())
    expect(UI_MODAL_SIZE.sm).toBe('max-w-[450px]')
    expect(UI_MODAL_SIZE.md).toBe('max-w-[560px]')
    expect(Object.keys(UI_MODAL_SIZE)).not.toContain('lg')
  })

  it('lets every width shrink in a narrow panel instead of overflowing it', () => {
    // `w-full` + `max-w-*` + `mx-4`: the pre-phase form shell was a hard
    // `w-[672px]`, which in a narrow embed ran under the panel edge.
    expect(UI_MODAL_DIALOG_CLASS).toContain('w-full')
    expect(UI_MODAL_DIALOG_CLASS).toContain('mx-4')
    for (const size of SIZES) {
      expect(UI_MODAL_SIZE[size].startsWith('max-w-')).toBe(true)
    }
  })

  it('sits above every other layer, including a modal already open', () => {
    // The two inline shells this replaces were at z-50, i.e. *under* a
    // confirmation opened on top of them.
    expect(UI_MODAL_OVERLAY_CLASS).toContain('z-[9999]')
    expect(UI_MODAL_OVERLAY_CLASS).toContain('fixed')
    expect(UI_MODAL_OVERLAY_CLASS).toContain('inset-0')
  })

  it('dims the page with one backdrop value for all modals', () => {
    expect(UI_MODAL_BACKDROP_CLASS).toContain('bg-black/50')
    // No `backdrop-blur`: two of the four shells had it, two did not, and the
    // acceptance puts steps 5 and 7 on the confirmation look.
    expect(UI_MODAL_BACKDROP_CLASS).not.toContain('backdrop-blur')
  })

  it('holds the 72px header the frames draw: 20 padding around a 32 row', () => {
    // 20 + 32 + 20 = 72, and the 24 glyph centred in the 32 box lands at 24 from
    // the edge — where `5562:49208` puts both the title and the close icon.
    expect(UI_MODAL_HEADER_CLASS).toContain('px-6')
    expect(UI_MODAL_HEADER_CLASS).toContain('py-5')
    expect(UI_MODAL_HEADER_CLASS).toContain('shrink-0')
    expect(UI_MODAL_CLOSE_CLASS).toContain('size-8')
  })

  it('draws the close control as a bare 24 glyph, not a filled circle', () => {
    // The frames show an `Icon` 24×24 with no plate under it. A background here
    // is the regression: it is what the pre-phase form shell had (grey 40) and
    // what the first phase-6 deploy re-introduced (ghost 32).
    expect(UI_MODAL_CLOSE_ICON_CLASS).toContain('size-6')
    expect(UI_MODAL_CLOSE_CLASS).not.toContain('bg-')
    expect(UI_MODAL_CLOSE_CLASS).toContain('text-ink-700')
  })

  it('types the heading 20/24 medium with no letter-spacing', () => {
    // The kit letter-spacing is 0 and the two shells contradicted each other
    // (+0.0703 against -0.45), so there was no current look to carry over.
    expect(UI_MODAL_TITLE_CLASS).toContain('text-xl/6')
    expect(UI_MODAL_TITLE_CLASS).toContain('font-medium')
    expect(UI_MODAL_TITLE_CLASS).toContain('text-ink-900')
    expect(UI_MODAL_TITLE_CLASS).not.toContain('tracking-')
  })

  it('keeps room for a badge beside the heading at the kit gap of 8', () => {
    // Kit Section card `3761:2273`: title, then Badge at x+8.
    expect(UI_MODAL_TITLE_CLASS).toContain('flex')
    expect(UI_MODAL_TITLE_CLASS).toContain('gap-2')
    expect(UI_MODAL_TITLE_CLASS).toContain('min-w-0')
  })

  it('pads body and footer on the kit spacing scale', () => {
    expect(UI_MODAL_BODY_CLASS).toContain('p-6')
    expect(UI_MODAL_FOOTER_CLASS).toContain('px-6')
    expect(UI_MODAL_FOOTER_CLASS).toContain('py-4')
    expect(UI_MODAL_FOOTER_CLASS).toContain('justify-end')
    expect(UI_MODAL_FOOTER_CLASS).toContain('gap-2')
    expect(UI_MODAL_FOOTER_CLASS).toContain('shrink-0')
  })

  it('keeps px out of everything that has to follow the embed knob', () => {
    // The widths are the documented exception: a modal lives on <body>, outside
    // the shell's overflow-hidden box. Padding, type and the close button are
    // rem and must stay that way or they stop scaling with the admin panel.
    const remOnly = [
      UI_MODAL_HEADER_CLASS,
      UI_MODAL_TITLE_CLASS,
      UI_MODAL_CLOSE_CLASS,
      UI_MODAL_CLOSE_ICON_CLASS,
      UI_MODAL_BODY_CLASS,
      UI_MODAL_FOOTER_CLASS,
    ]
    for (const classes of remOnly) {
      expect(classes).not.toMatch(/\[[^\]]*\d+px[^\]]*\]/)
    }
  })

  it('resolves a full class set per size', () => {
    for (const size of SIZES) {
      const classes = resolveUiModalClasses(size)
      expect(classes.dialog).toContain(UI_MODAL_SIZE[size])
      expect(classes.dialog).toContain('max-h-[85vh]')
      expect(classes.overlay).toBe(UI_MODAL_OVERLAY_CLASS)
      expect(classes.backdrop).toBe(UI_MODAL_BACKDROP_CLASS)
      expect(classes.header).toBe(UI_MODAL_HEADER_CLASS)
      expect(classes.title).toBe(UI_MODAL_TITLE_CLASS)
      expect(classes.close).toBe(UI_MODAL_CLOSE_CLASS)
      expect(classes.closeIcon).toBe(UI_MODAL_CLOSE_ICON_CLASS)
      expect(classes.body).toBe(UI_MODAL_BODY_CLASS)
      expect(classes.footer).toBe(UI_MODAL_FOOTER_CLASS)
    }
  })

  it('defaults to the confirmation width', () => {
    expect(resolveUiModalClasses().dialog).toContain(UI_MODAL_SIZE.sm)
  })
})
