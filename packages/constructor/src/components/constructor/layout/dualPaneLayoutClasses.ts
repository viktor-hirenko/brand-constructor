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
 * This is the measuring stand — the root is 16 and every number in the
 * inspector equals its number in Figma.
 *
 * Embedded (Admin iframe): fills the panel edge-to-edge, no fixed size and no
 * card chrome. Since this work the root is 16 there too: the columns adapt,
 * the components do not (`constants/wizardResponsive.ts`). Above 1920 the
 * frame inside gets the kit's 1700 cap — `app.css`, `__content` / `__frame`.
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
 * For its whole life this class was inert: its rules (a 5px track, an
 * `rgb(0 0 0 / 0.12)` thumb) lived in `styles/global.scss`, which `main.ts`
 * never imported, so the left pane always showed the browser default.
 * Divergences row 70 left the decision open — and the kit has now answered it,
 * because it draws a bar on every one of the four breakpoint frames
 * (`5395:118756` and siblings): 6 wide, radius 100, `#e6e6e6`, inset 4 from
 * the pane edge. `wizard-scrollbar` in `app.css` is that bar.
 */
export const LEFT_PANE_SCROLL_TRACK_CLASS = 'left-pane-scroll wizard-scrollbar'

/**
 * Horizontal padding of the scrolling pane — kit `spacing/32` on both sides
 * (`Step content` on every breakpoint frame is `p-32`).
 *
 * The right side is 22 rather than 32 because the drawn scrollbar reserves the
 * other 10: `scrollbar-gutter: stable` keeps that gutter whether or not the
 * content overflows, so the content column stays exactly 527 wide at a 591
 * pane — which is the number the mockup gives it.
 */
export const LEFT_PANE_SCROLL_GUTTER_CLASS = 'pl-8 pr-[1.375rem]'

/**
 * Nothing to compensate any more: the pane's own padding is the kit's 32 and
 * the scrollbar lives in the reserved gutter beside it. Kept as an empty
 * string so the three shells keep one named hook for the inner column.
 */
export const LEFT_PANE_SCROLL_INNER_CLASS = ''

/**
 * Left column width.
 *
 * `flex-1` — the remainder, which is exactly what the kit does: the RIGHT
 * column is the driver (`right = pane height − 56`, see
 * `constants/wizardResponsive.ts`) and the left one takes what is left.
 * Checked on all five drawn frames; the old `w-[42%]` matched none of them.
 */
export function leftPanelWidthClass(fullWidth: boolean): string {
  return fullWidth ? 'w-full' : 'min-w-0 flex-1'
}

/**
 * Left column background — kit `bg/alt-1` #f9f9fb on every breakpoint frame
 * and on the drawn step-8 review. Was #f9f9f9, which is in no kit section.
 */
export function leftPanelBgClass(_reviewShell?: boolean): string {
  return 'bg-ink-100'
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
    return `${base} pt-8 pb-0 flex flex-col overflow-hidden`
  }

  if (mode === 'review') {
    // Horizontal inset on ReviewUnifiedView scroll body; vertical pad scrolls with content.
    return `${base} flex flex-col overflow-hidden`
  }

  // wizard — kit `spacing/32` all round; the right side gives 10 of its 32 to
  // the drawn scrollbar's reserved gutter (see LEFT_PANE_SCROLL_GUTTER_CLASS).
  const step8 = opts.wizardStep === 8
  const overflow = step8 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
  const horizontalPad = step8 ? 'px-8' : LEFT_PANE_SCROLL_GUTTER_CLASS
  return `${base} ${horizontalPad} pt-8 pb-8 ${overflow}`
}

interface RightPaneOptions {
  wizardStep?: number
}

/**
 * Outer right column: bg and the kit's 32 padding. The WIDTH is not a class —
 * it is measured, because the kit derives it from the pane height
 * (`useWizardPaneMetrics` + `constants/wizardResponsive.ts`). Everything here
 * keeps `min-w-0` so the measured width, not the content, decides.
 *
 * Padding is `spacing/32` on all four sides in every drawn frame — the mixed
 * 48 / 20 / 44 / 100 this function used to hand out matched no kit node, and
 * the vertical pair is what made the square come out rectangular.
 *
 * The pane scrolls rather than squashing the square: that is bullet four of
 * the designer's sticker `5395:118367`.
 *
 * `border-l` is the kit's vertical `Divider` — a 1px `divider/default` #eaeaeb
 * between the columns on every breakpoint frame. It is drawn as its own
 * zero-width node there; here it rides the right pane, so the measured width
 * stays the outer box.
 */
export function rightPaneClass(mode: LayoutMode, _opts: RightPaneOptions = {}): string {
  const base =
    'constructor-dual-pane-shell__right wizard-scrollbar min-h-0 min-w-0 shrink-0 border-l border-ink-300 bg-card p-8'

  if (mode === 'review') {
    return `${base} flex flex-col overflow-y-auto`
  }

  if (mode === 'edit') {
    return `${base} relative overflow-y-auto`
  }

  return `${base} flex h-full min-h-0 flex-col overflow-y-auto`
}
