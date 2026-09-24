/**
 * Class map for `UiWizardHeader.vue`.
 *
 * Kit source: `Wizard header` `5382:30951`, 1230×73 — the one component of the
 * kit's 34 that had no counterpart in this tree at all.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5382-30951&m=dev
 *
 * Measured off the symbol export + `get_variable_defs`, not transcribed from
 * the plan:
 *
 *   root      bg/body #ffffff, border-bottom 1px accordion/border/default
 *             #eaeaeb, column, centred
 *   content   max-width 1700, padding 32 / 24, gap 16 — 24 + 24 + 24 = 72,
 *             plus the 1px rule = the 73 the symbol is drawn at
 *   title     header/m 20/24 weight 500 in content/primary #1f1f2e
 *   badge     Badge Neutral with both icon slots off, label "2/8" — i.e. the
 *             step counter, confirmed on the drawn 1440 breakpoint
 *             `5395:118730`
 *   close     a bare 24 glyph, no button chrome; content/tertiary #6f6f7d is
 *             the only variable of the node left unaccounted by the rest
 *   progress  track 1px `progress bar/bg` #eaeaeb pinned to the bottom edge,
 *             fill 3px `progress bar/line` #030213 sitting 2px above it. The
 *             symbol ships it as `right: 87.5%`, i.e. exactly 1/8.
 *
 * ── Why the progress moved here ──────────────────────────────────────────────
 * Until this work the wizard drew an 8px labelled bar inside `UiStepHeader`,
 * in the left column. The kit's `Step header` `3984:8226` has no progress node
 * at all — not even a hidden one — and every drawn screen puts the progress
 * here instead, as the bottom rule of this component. Divergences rows 4 and 79.
 *
 * ── Units ────────────────────────────────────────────────────────────────────
 * Component geometry is rem-on-Tailwind's-scale (`px-8` 32, `py-6` 24, `gap-4`
 * 16, `text-xl/6` 20/24). The three lengths that stay `px` are hairlines and a
 * viewport measurement: the 1px rule, the 1px track, the 3px fill, and the
 * 1700 content cap, which the kit states in viewport pixels on the 2560
 * breakpoint (`5395:119538`) and which must not move with anything.
 */

export interface UiWizardHeaderClassSet {
  /** Outer bar: white, one hairline rule along the bottom. */
  root: string
  /** The 1700-capped row that carries the padding. */
  content: string
  /** Title and its step badge — 8 apart, title never wraps. */
  titleRow: string
  /** header/m 20/24 medium in `content/primary`. */
  title: string
  /** The bare 24 close glyph. */
  close: string
  /** Icon inside the close control. */
  closeIcon: string
  /** 1px track pinned to the bottom edge of the bar. */
  progressTrack: string
  /** 3px fill; width comes from an inline style, not a class. */
  progressFill: string
}

/**
 * `border-b` is the kit's `accordion/border/default` #eaeaeb = `--color-ink-300`.
 * `relative` anchors the progress rule, which the kit pins to the bottom edge.
 */
export const UI_WIZARD_HEADER_ROOT_CLASS =
  'ui-wizard-header relative flex w-full shrink-0 flex-col items-center border-b border-ink-300 bg-card'

/** kit `spacing/32` / `spacing/24` padding, `spacing/16` gap, content cap 1700. */
export const UI_WIZARD_HEADER_CONTENT_CLASS =
  'ui-wizard-header__content flex w-full max-w-[1700px] items-center gap-4 overflow-hidden px-8 py-6'

/** kit `spacing/8` between the title and the step badge. */
export const UI_WIZARD_HEADER_TITLE_ROW_CLASS =
  'ui-wizard-header__title-row flex min-w-0 flex-1 items-center gap-2'

/** `text-xl/6` is 1.25rem/1.5rem = the kit's header/m 20/24. */
export const UI_WIZARD_HEADER_TITLE_CLASS =
  'ui-wizard-header__title truncate text-xl/6 font-medium text-ink-900'

/** No button chrome in the kit: a 24 glyph that darkens on hover. */
export const UI_WIZARD_HEADER_CLOSE_CLASS =
  'ui-wizard-header__close inline-flex size-6 shrink-0 cursor-pointer items-center justify-center text-ink-700 transition-colors hover:text-ink-900'

export const UI_WIZARD_HEADER_CLOSE_ICON_CLASS = 'size-6 shrink-0'

/** `progress bar/bg` #eaeaeb, 1px, flush with the bar's own bottom rule. */
export const UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS =
  'ui-wizard-header__progress absolute inset-x-0 -bottom-px h-px bg-ink-300'

/** `progress bar/line` #030213, 3px, riding 2px above the track. */
export const UI_WIZARD_HEADER_PROGRESS_FILL_CLASS =
  'ui-wizard-header__progress-fill absolute left-0 -top-0.5 h-[3px] bg-primary transition-[width] duration-300'

export function resolveUiWizardHeaderClasses(): UiWizardHeaderClassSet {
  return {
    root: UI_WIZARD_HEADER_ROOT_CLASS,
    content: UI_WIZARD_HEADER_CONTENT_CLASS,
    titleRow: UI_WIZARD_HEADER_TITLE_ROW_CLASS,
    title: UI_WIZARD_HEADER_TITLE_CLASS,
    close: UI_WIZARD_HEADER_CLOSE_CLASS,
    closeIcon: UI_WIZARD_HEADER_CLOSE_ICON_CLASS,
    progressTrack: UI_WIZARD_HEADER_PROGRESS_TRACK_CLASS,
    progressFill: UI_WIZARD_HEADER_PROGRESS_FILL_CLASS,
  }
}

/** The kit's own title copy — "Brand Creation" on all 29 drawn screens. */
export const UI_WIZARD_HEADER_TITLE = 'Brand Creation'

/**
 * The badge copy, read off the drawn 1440 breakpoint `5395:118730`: the step
 * counter as `2/8`, not the wizard's own "Крок 2 з 8".
 */
export function formatWizardStepBadge(currentStep: number, totalSteps: number): string {
  return `${currentStep}/${totalSteps}`
}

/**
 * Share of the bar the fill covers, 0–100, **unrounded**.
 *
 * The kit states it as a fraction — `right: 87.5%` for step 1 of 8 — so the
 * rounding the old labelled bar did (13% for step 1) would miss the drawn line
 * by a pixel at every step. Values outside the range are clamped, not trusted.
 */
export function wizardProgressPercent(currentStep: number, totalSteps: number): number {
  if (!Number.isFinite(currentStep) || !Number.isFinite(totalSteps) || totalSteps <= 0) return 0
  return Math.min(100, Math.max(0, (currentStep / totalSteps) * 100))
}
