/**
 * Class map for `UiProgressBar.vue`.
 *
 * Kit source: Figma `3889:2807` (Progress bar, Step = 1…8 — exactly the eight
 * wizard steps) and `3889:2849` (Progress bar with label).
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3889-2849&m=dev
 *
 * Kit variables read off `3889:2849`:
 *   progress bar/label #6f6f7d · caption l 14/16 regular · spacing/8 between
 *   label and track · track 8 tall · radius/progress-bar 1000 ·
 *   progress bar/bg #ededee · progress bar/line #030213
 *
 * ── One recipe replaces two ──────────────────────────────────────────────────
 * Before DP-15258 phase 3 the wizard drew `bg-muted` / `bg-primary` and the
 * review shell drew `bg-black/10` / `bg-foreground` — same widget, two
 * palettes. The kit's own pair is `#ededee` / `#030213`, which is `ink-300` /
 * `primary` here, so the wizard was already right and the review shell moves.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * `h-2` is 0.5rem and `gap-2` is 0.5rem, so the whole bar follows the single
 * embed knob (`app.css` `html.wizard-embed`). No `px` length may appear here.
 *
 * There is no letter-spacing here any more. The label carried −0.15px under
 * open question 7's default answer — keep the current rendering on carry-over
 * screens — and the owner has closed that question the other way: the kit sets
 * 0 on all five of its type styles, so every letter-spacing in the wizard came
 * off at once (divergences row 6).
 *
 * The class name is deliberately NOT spelled out here. Tailwind v4 scans raw
 * text, comments included, and emits a rule for anything that looks like a
 * class — so naming one in prose ships a dead rule in the built css and makes
 * a grep of that css read as though the work was never done.
 */

export interface UiProgressBarClassSet {
  /** Wrapper around label + track. */
  root: string
  /** The "Крок N з M" line above the track. */
  label: string
  /** The unfilled track. */
  track: string
  /** The filled portion; width comes from an inline style, not a class. */
  fill: string
}

/** 8px between the label and the track — kit `spacing/8`. */
export const UI_PROGRESS_BAR_ROOT_CLASS = 'ui-progress-bar flex w-full flex-col gap-2'

/** caption l 14/16 in `progress bar/label` #6f6f7d. `text-sm/4` is 14/16. */
export const UI_PROGRESS_BAR_LABEL_CLASS = 'ui-progress-bar__label text-sm/4 text-ink-700'

/** 8 tall, radius 1000, `progress bar/bg` #ededee. */
export const UI_PROGRESS_BAR_TRACK_CLASS =
  'ui-progress-bar__track h-2 w-full overflow-hidden rounded-full bg-ink-300'

/** `progress bar/line` #030213 — already `--color-primary`. */
export const UI_PROGRESS_BAR_FILL_CLASS =
  'ui-progress-bar__fill h-full rounded-full bg-primary transition-all duration-300'

export function resolveUiProgressBarClasses(): UiProgressBarClassSet {
  return {
    root: UI_PROGRESS_BAR_ROOT_CLASS,
    label: UI_PROGRESS_BAR_LABEL_CLASS,
    track: UI_PROGRESS_BAR_TRACK_CLASS,
    fill: UI_PROGRESS_BAR_FILL_CLASS,
  }
}

/** Clamp to 0–100 so a bad percentage cannot push the fill past the track. */
export function clampProgressPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  return Math.min(100, Math.max(0, percent))
}

/** The kit label copy, so all three shells cannot drift apart again. */
export function formatStepLabel(currentStep: number, totalSteps: number): string {
  return `Крок ${currentStep} з ${totalSteps}`
}
