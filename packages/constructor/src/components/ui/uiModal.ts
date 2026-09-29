/**
 * Class map for `UiModal.vue`.
 *
 * ── The kit had no modal; the screens now do ─────────────────────────────────
 * Open question 6 of DP-15258 said Figma ships no modal window, so this file
 * started as *our decision*, assembled from three kit parts: Section card
 * `3761:2273` (header row → divider → content), Divider `3446:5229` and Button
 * `3333:5860`.
 *
 * **On 2026-09-15 the owner pointed at five freshly drawn frames** on the new
 * key-screen canvas, all carrying the same modal shell:
 *   `5562:49171` · `5562:49268` · `5562:49684` · `5562:49771` · `5562:48269`
 *   https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5562-49171&m=dev
 * The assembled shell and the drawn one agreed on everything that matters —
 * `radius/modal` 16, header 72 with 24 padding, divider, body 24, footer 80 with
 * 48-tall buttons right-aligned at gap 8, title `header m` 20/24 weight 500 in
 * `content/primary` #1f1f2e with zero letter-spacing. Two values did not, and
 * the drawn frames win: the close control is a bare 24 icon (not a filled
 * circle), and every brief form is 560 wide (not 672). Open question 6 is
 * answered by the design, not by us.
 *
 * The four shells this replaces: `ui/ConfirmationModal.vue`,
 * `constructor/modals/BriefModalShell.vue` and the two inline `Teleport`s in
 * `views/wizard/MarketingPackageView.vue` and `views/wizard/VisualComponentsView.vue`.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts` and `ui/uiAlert.ts`.
 *
 * ── Units: this file is the documented exception ─────────────────────────────
 * "Железные правила адаптива" (`docs/design-audit/dp-15258-ui-kit.md`) bans
 * `vw`/`vh` everywhere in the wizard *except* inside `Teleport to="body"`, and
 * a modal is exactly that: it is teleported out of the shell so that the
 * shell's `transform: scale()` and its `overflow-hidden` do not apply to it.
 * Hence `max-h-[85vh]` — 85% of the iframe panel, which is what makes a long
 * modal scroll instead of running off the panel. It must not be removed and the
 * dialog must not be lifted back into the shell.
 *
 * The widths stay in `px` on purpose. They are the values the four shells
 * already shipped, and a modal that lives on `<body>` is not inside the
 * `overflow-hidden` box that makes `px` dangerous elsewhere. Everything *inside*
 * the modal (text, padding, button heights) is rem and still follows the single
 * embed knob in `app.css` `html.wizard-embed`.
 */

/**
 * One width scale for every modal in the wizard. The five widths that existed
 * before (450 / 448 / 560 / 600 / 672) collapse onto two: the drawn frames put
 * *every* form at 560, and the confirmations — which the design never drew —
 * keep the 450 they always had.
 */
export type UiModalSize = 'sm' | 'md'

export const UI_MODAL_SIZE: Record<UiModalSize, string> = {
  /** Confirmations and the delegate dialog. No Figma frame; 450 is the legacy value. */
  sm: 'max-w-[450px]',
  /** Every brief form and the PR package detail — 560 in all five drawn frames. */
  md: 'max-w-[560px]',
}

/**
 * `z-[9999]` and not `z-50`: a confirmation can open on top of an already open
 * form modal (delete the brief while the order modal is up), and the two inline
 * shells this replaces sat at `z-50`, i.e. *under* it.
 */
export const UI_MODAL_OVERLAY_CLASS =
  'ui-modal fixed inset-0 z-[9999] flex items-center justify-center'

export const UI_MODAL_BACKDROP_CLASS = 'ui-modal__backdrop absolute inset-0 bg-black/50'

/**
 * The same `/50` as a number, for the Admin's half of the dim (DP-15450,
 * Concept Selection 6 — see `composables/useAdminDim.ts`). A test keeps the two
 * in step.
 */
export const UI_MODAL_BACKDROP_ALPHA = 0.5

/**
 * Radius 16 (`rounded-2xl`) is the kit card radius. `overflow-hidden` is what
 * makes the scrolling body respect those corners. `max-h-[85vh]` — see the unit
 * note above.
 */
export const UI_MODAL_DIALOG_CLASS =
  'ui-modal__dialog relative mx-4 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]'

/**
 * Header height 72, as drawn. The arithmetic is 20 + 32 + 20, not 24 + 24 + 24:
 * the row is as tall as the close box (32), and the 24 glyph centred in it lands
 * 4 lower, i.e. at 24 from the header edge — which is where the frame puts both
 * the title baseline box and the icon. Paying the padding in 20 keeps the drawn
 * 72 while giving the close control a 32 target. The two shells it unifies were
 * 72 (`p-6` around a 24 line) and 73 (`h-[73px]`).
 */
export const UI_MODAL_HEADER_CLASS = 'ui-modal__header flex shrink-0 items-center gap-5 px-6 py-5'

/**
 * 20/24 medium. 20 is not a kit type size (the kit jumps 18 → 24), but both old
 * shells were already at 20 and phase 6 is a carry-over, not a redesign. The
 * letter-spacing is dropped: the kit is 0 and the two shells contradicted each
 * other (+0.0703 against -0.45), so there was no single "current look" to keep.
 * The row is `flex` so a call site can hang a badge next to the title — the kit
 * Section card header does exactly that, at gap 8.
 */
export const UI_MODAL_TITLE_CLASS =
  'ui-modal__title flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xl/6 font-medium text-ink-900'

/**
 * A bare 24 icon, as drawn (`Icon` 24×24 at the 24 padding edge) — no circle, no
 * fill, in `content/tertiary` #6f6f7d. It replaces two different buttons: a grey
 * 40 circle in the form shell and a 24 ghost square in the confirmation shell.
 *
 * The clickable box stays 32 while the glyph is 24: at rest nothing is painted,
 * so the header looks exactly like the frame, but the target does not drop to
 * the 24 minimum. Hover darkens the glyph instead of painting a plate — the
 * frames draw no hover state for it, and `UiIconButton` (phase 8) is where
 * Solid / Glass fills belong.
 */
export const UI_MODAL_CLOSE_CLASS =
  'ui-modal__close flex size-8 shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:text-ink-900'

export const UI_MODAL_CLOSE_ICON_CLASS = 'ui-modal__close-icon size-6'

/**
 * `min-h-0` is load-bearing: without it a flex child refuses to shrink below
 * its content and `overflow-y-auto` never scrolls — the dialog grows past
 * `max-h-[85vh]` instead. Same failure as the `min-h-0` chain in the shell.
 */
export const UI_MODAL_BODY_CLASS = 'ui-modal__body min-h-0 flex-1 overflow-y-auto p-6'

/** Actions right-aligned, kit spacing 8 between them, 24/16 padding box. */
export const UI_MODAL_FOOTER_CLASS =
  'ui-modal__footer flex shrink-0 items-stretch justify-end gap-2 px-6 py-4'

export interface UiModalClasses {
  overlay: string
  backdrop: string
  dialog: string
  header: string
  title: string
  close: string
  closeIcon: string
  body: string
  footer: string
}

export function resolveUiModalClasses(size: UiModalSize = 'sm'): UiModalClasses {
  return {
    overlay: UI_MODAL_OVERLAY_CLASS,
    backdrop: UI_MODAL_BACKDROP_CLASS,
    dialog: `${UI_MODAL_DIALOG_CLASS} ${UI_MODAL_SIZE[size]}`,
    header: UI_MODAL_HEADER_CLASS,
    title: UI_MODAL_TITLE_CLASS,
    close: UI_MODAL_CLOSE_CLASS,
    closeIcon: UI_MODAL_CLOSE_ICON_CLASS,
    body: UI_MODAL_BODY_CLASS,
    footer: UI_MODAL_FOOTER_CLASS,
  }
}
