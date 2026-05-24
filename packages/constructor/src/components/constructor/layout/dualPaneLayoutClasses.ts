/**
 * Single source of truth for Constructor dual-pane shell spacing.
 * Tailwind classes only — change here to update wizard / edit / review screens.
 */

export type LayoutMode = 'wizard' | 'edit' | 'review'

export const SHELL_BASE_CLASS =
  'relative shrink-0 w-[1440px] h-[900px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex'

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
  const base = 'constructor-dual-pane-shell__main-content min-h-0 flex-1'

  if (mode === 'edit') {
    // Horizontal inset (48px) is on EditFlowStepShell — keeps HR/footer full column width.
    return `${base} pt-12 pb-0 flex flex-col overflow-hidden`
  }

  if (mode === 'review') {
    return `${base} flex flex-col overflow-hidden p-12`
  }

  // wizard
  const step8 = opts.wizardStep === 8
  const overflow = step8 ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
  return `${base} px-12 pt-12 pb-12 ${overflow}`
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
