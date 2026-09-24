/**
 * Single source of truth for Constructor dual-pane shell spacing.
 * Tailwind classes only — change here to update wizard / edit / review screens.
 */

export type LayoutMode = 'wizard' | 'edit' | 'review'

/**
 * `flex-col`, not `flex`: since the Wizard header (`5382:30951`) exists, the
 * shell is the kit's `Wizard` — header on top, the two panes as the row below.
 * The row lives in `ConstructorDualPaneShell.vue` as `__body`.
 */
export const SHELL_BASE_CLASS =
  'relative shrink-0 w-[1440px] h-[900px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col'

/**
 * Outer shell wrapper class.
 *
 * Standalone: fixed 1440×900 card (scaled to the viewport via CSS transform).
 * Embedded (Admin iframe): fills the panel edge-to-edge (no fixed size, no
 * card chrome) while the fluid root font-size (`html.wizard-embed`) reflows
 * the rem-based content to fit. Columns are already `%`, so width fills; height
 * fills via flex; footer stays pinned.
 */
export function shellBaseClass(embed = false): string {
  if (embed) {
    return 'relative w-full h-full bg-card overflow-hidden flex flex-col'
  }
  return SHELL_BASE_CLASS
}

/**
 * Scroll track styling hook.
 *
 * The rules this class used to carry (thin 5px track, `rgb(0 0 0 / 0.12)`
 * thumb) lived in `styles/global.scss`, and that file was never imported by
 * `main.ts` — so the class has been inert in production for its whole life, not
 * only since DP-15258 phase 19 deleted the file. The left pane has always shown
 * the browser's default scrollbar.
 *
 * Kept as-is rather than removed: reviving the styling is a visible change on
 * every wizard screen, which is a decision for the owner, not a side effect of
 * a login-page phase. Recorded as row 70 of
 * `docs/design-audit/dp-15258-divergences.md`.
 */
export const LEFT_PANE_SCROLL_TRACK_CLASS = 'left-pane-scroll'

/** On the element with overflow-y-auto: narrow right gutter for scrollbar. */
export const LEFT_PANE_SCROLL_GUTTER_CLASS = 'pl-12 pr-3'

/** Inner content: keeps ~48px inset from column right (pr-3 + pr-9). */
export const LEFT_PANE_SCROLL_INNER_CLASS = 'pr-9'

export function leftPanelWidthClass(fullWidth: boolean): string {
  return fullWidth ? 'w-full' : 'w-[42%]'
}

/** Left column background — same for wizard, edit, and review. */
export function leftPanelBgClass(_reviewShell?: boolean): string {
  return 'bg-[#f9f9f9]'
}

interface LeftContentPaddingOptions {
  reviewShell: boolean
  wizardStep: number
}

/** Padding on the scrollable main-content area inside the left column. */
export function leftContentPaddingClass(mode: LayoutMode, opts: LeftContentPaddingOptions): string {
  const base = `constructor-dual-pane-shell__main-content ${LEFT_PANE_SCROLL_TRACK_CLASS} min-h-0 flex-1`

  if (mode === 'edit') {
    // Horizontal inset on EditFlowStepShell scroll body — keeps HR/footer full column width.
    return `${base} pt-12 pb-0 flex flex-col overflow-hidden`
  }

  if (mode === 'review') {
    // Horizontal inset on ReviewUnifiedView scroll body; vertical pad scrolls with content.
    return `${base} flex flex-col overflow-hidden`
  }

  // wizard — asymmetric horizontal padding: narrow right gutter for scrollbar
  const step8 = opts.wizardStep === 8
  const overflow = step8 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
  const horizontalPad = step8 ? 'px-12' : LEFT_PANE_SCROLL_GUTTER_CLASS
  return `${base} ${horizontalPad} pt-12 pb-12 ${overflow}`
}

interface RightPaneOptions {
  wizardStep?: number
}

/** Outer right column (58%): width, bg, padding. */
export function rightPaneClass(mode: LayoutMode, opts: RightPaneOptions = {}): string {
  const base = 'constructor-dual-pane-shell__right min-h-0 bg-white'

  if (mode === 'review') {
    return `${base} w-[58%] flex flex-col overflow-hidden p-12`
  }

  if (mode === 'edit') {
    return `${base} w-[58%] relative overflow-y-auto pt-[20px] pb-[100px] px-12`
  }

  const step = opts.wizardStep ?? 1
  const verticalPad = step >= 2 && step <= 4 ? 'pt-6 pb-[44px]' : 'pt-12 pb-12'
  // Step 1 empty preview must fill column height — overflow-y-auto shrinks flex children to content.
  const overflow = step === 1 ? 'overflow-hidden' : 'overflow-y-auto'
  return `${base} w-[58%] flex flex-col min-h-0 h-full ${overflow} px-12 ${verticalPad}`
}
