/**
 * Class map for `UiModal.vue`.
 *
 * ── The kit has no modal ─────────────────────────────────────────────────────
 * Open question 6 of DP-15258: Figma ships no modal window, and the code had
 * four shells. This file is therefore *our decision*, not a trace of a node.
 * It is assembled from three kit parts:
 *   · Section card `3761:2273` — header row, then a divider, then the content.
 *     https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3761-2273&m=dev
 *   · Divider `3446:5229` — the rule under the header and above the footer,
 *     rendered by `UiDivider`, so the hairline is the kit `#ededee`.
 *   · Button `3333:5860` — every action inside a modal is `UiButton` on the kit
 *     recipe. Phase 6 is the one that flips the four modals over to it.
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
 * before (450 / 448 / 560 / 600 / 672) collapse onto the three that carry real
 * differences in content: a confirmation, a medium form, a wide form.
 */
export type UiModalSize = 'sm' | 'md' | 'lg'

export const UI_MODAL_SIZE: Record<UiModalSize, string> = {
  /** Confirmations and the delegate dialog. */
  sm: 'max-w-[450px]',
  /** Medium forms: the internal-naming order modal, the PR package detail. */
  md: 'max-w-[560px]',
  /** Wide forms: concept and external-naming order modals, PR package preview. */
  lg: 'max-w-[672px]',
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
 * Radius 16 (`rounded-2xl`) is the kit card radius. `overflow-hidden` is what
 * makes the scrolling body respect those corners. `max-h-[85vh]` — see the unit
 * note above.
 */
export const UI_MODAL_DIALOG_CLASS =
  'ui-modal__dialog relative mx-4 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]'

/**
 * Header height is 72 = 20 + 32 + 20, where 32 is the close button. The two
 * shells it unifies were 72 (`p-6` around a 24 line) and 73 (`h-[73px]`), so
 * nothing moves visibly; the close button grows into the space instead.
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
 * Round 32 — the small size of the kit icon button `3333:5541`, ghost fill.
 * Replaces two different buttons: a grey 40 circle in the form shell and a
 * 24 ghost square in the confirmation shell. The fill variants (Solid / Glass)
 * belong to phase 8, which owns `UiIconButton`; this stays neutral until then.
 */
export const UI_MODAL_CLOSE_CLASS =
  'ui-modal__close flex size-8 shrink-0 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-ink-200 hover:text-ink-900'

export const UI_MODAL_CLOSE_ICON_CLASS = 'ui-modal__close-icon size-5'

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
