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
 * **It was 32 / 22, and the missing 10 were never given back.** The idea was
 * that `scrollbar-gutter: stable` reserves the other 10 for the drawn
 * scrollbar, so the content would come out at the kit's 527 in a 591 pane. It
 * does not: the gutter is zero whenever the browser uses OVERLAY scrollbars,
 * which is the macOS default and the machine this is reviewed on. The content
 * came out 536 instead — measured in the owner's own DevTools — and since the
 * concept grid is `auto-fill` over her card size, those 10 landed on the
 * cards: 128.25 each at 1440 where the kit draws 125.75.
 *
 * With a plain 32 the four drawn breakpoints land on her card sizes exactly,
 * and that is the check that this number is right rather than merely nicer:
 *
 *   1280  pane 479 → content 415 → 3 × **133**    (415 − 2×8) / 3
 *   1440  pane 591 → content 527 → 4 × **125.75** (527 − 3×8) / 4
 *   1920  pane 879 → content 815 → 5 × **156.6**  (815 − 4×8) / 5
 *   2560  pane 796 → content 732 → 5 × **140**    (732 − 4×8) / 5
 *
 * The drawn bar overlays that padding rather than pushing the content, which
 * is what the kit shows: `5382:64143` sits 4 in from the pane's own edge, not
 * beside the content. A browser with classic scrollbars will take its 10 out
 * of the 32 when the pane actually overflows; that is the platform's business
 * and it is the same on any web page.
 */
export const LEFT_PANE_SCROLL_GUTTER_CLASS = 'px-8'

/**
 * Nothing to compensate any more: the pane's own padding is the kit's 32 and
 * the scrollbar lives in the reserved gutter beside it. Kept as an empty
 * string so the three shells keep one named hook for the inner column.
 */
export const LEFT_PANE_SCROLL_INNER_CLASS = ''

/**
 * Left column width, and the rule between the columns.
 *
 * `flex-1` — the remainder, which is exactly what the kit does: the RIGHT
 * column is the driver (see `constants/wizardResponsive.ts`) and the left one
 * takes what is left. Checked on all five drawn frames; the old `w-[42%]`
 * matched none of them.
 *
 * The kit's vertical `Divider` rides HERE rather than on the right pane,
 * because it is drawn full height while the panel is not: on `5382:48413` the
 * divider is 713 tall next to a 695-tall panel. Dropped when the right column
 * is hidden (steps 5 and 6), where there is nothing to divide.
 *
 * **It is drawn, not bordered, and the 1px is the reason.** In the kit the
 * `Divider` is a node of width **0** sitting between a 591 pane and a 639 one
 * — 591 + 639 = 1230, the whole row — so the rule costs the left pane nothing
 * and its content is the full 527. A `border-r` costs exactly 1, and 1 is not
 * a rounding error here: the concept grid is `auto-fill` over her card size,
 * and four cards plus three gaps come to 527 **exactly**, so a content box of
 * 526 drops the grid to three columns and blows the cards up to 170.
 * `wizard-pane-divider` in `app.css` paints the same line as an overlay.
 */
export function leftPanelWidthClass(fullWidth: boolean): string {
  return fullWidth ? 'w-full' : 'min-w-0 flex-1 wizard-pane-divider'
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
 * Outer right column: bg and the kit's 32 padding. Neither the WIDTH nor the
 * HEIGHT is a class — both are measured, because the kit derives them from the
 * square inside (`useWizardPaneMetrics` + `constants/wizardResponsive.ts`).
 * Everything here keeps `min-w-0` / `min-h-0` so the measured box, not the
 * content, decides.
 *
 * No `h-full`: once the square reaches the size drawn for the breakpoint the
 * panel stops with it and sits at the top of a taller column, white space
 * underneath — `5382:48440` is 639×695 in a 713-tall row, `5387:105207` the
 * same in a 785-tall one. Stretching it was the defect.
 *
 * Padding is `spacing/32` on all four sides in every drawn frame — the mixed
 * 48 / 20 / 44 / 100 this function used to hand out matched no kit node. Only
 * the VERTICAL 32 is here: the horizontal pair moved inside, onto the header
 * and onto the scroll area, so that the scroll area can span the pane edge to
 * edge. Two reasons, and the kit gives both on the short frame `5395:119983`:
 * its bar `5396:120156` floats in the pane's padding, 4 in from the pane edge
 * and 22 clear of the square; and with the padding out here the gutter that
 * `scrollbar-gutter: stable` reserves came out of the SQUARE, which is why the
 * square was 10 narrower than it was tall.
 *
 * The pane itself no longer scrolls — `overflow-hidden`. What scrolls is the
 * area around the square, inside the panel and below its header, so the header
 * stays put (divergences row 94, the owner's decision). Bullet four of the
 * sticker `5395:118367` is still honoured: a window too short for the square
 * scrolls it rather than squashing it.
 *
 * The divider between the columns is on the LEFT pane, because it is drawn
 * full height and this one is not.
 */
export function rightPaneClass(mode: LayoutMode, opts: RightPaneOptions = {}): string {
  const base =
    'constructor-dual-pane-shell__right min-h-0 min-w-0 shrink-0 bg-card py-8 overflow-hidden'

  if (mode === 'review') {
    return `${base} flex flex-col`
  }

  if (mode === 'edit') {
    return `${base} relative flex flex-col`
  }

  return `${base} flex min-h-0 flex-col`
}
