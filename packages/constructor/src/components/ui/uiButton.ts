/**
 * Class map for `UiButton.vue`.
 *
 * Kit source: Figma `3333:5860` — Style = Primary / Secondary / Neutral / Ghost
 * × State = Default / Hovered / Disabled × Size = S-32 / M-40 / L-48.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3333-5860&m=dev
 *
 * Why a `.ts` map and not component tests: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`/`happy-dom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting a component is impossible here. So the part
 * that can hold a regression, the class decision, is a pure function, and the
 * markup stays under manual acceptance on prod. Same idiom as
 * `ui/uiIconButton.ts`, `ui/uiBadge.ts` and `ui/uiLink.ts`.
 *
 * ── One recipe as of phase 10 (2026-09-15) ───────────────────────────────────
 * Phase 1 shipped this file with two: the kit matrix behind a `kit` flag, and a
 * byte-for-byte copy of the pre-kit primary/secondary pair that four modal
 * shells were still rendering. Phases 4 and 6 moved the last of those shells,
 * phase 10 converted the raw `<button>`s of the review screens, and the flag,
 * the `UI_BUTTON_LEGACY_*` strings and the `hasIcon` gap they needed are gone
 * with them. Every call site now gets Figma `3333:5860` and nothing else.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * Every utility below resolves to `rem` (Tailwind's spacing/text scales are
 * rem-based). That is not a preference: the wizard is embedded in an Admin
 * iframe and scales from a single root font-size (`app.css` `html.wizard-embed`),
 * so a `px` length here would silently stop following the panel size. Guarded by
 * `tests/unit/components/ui/uiButton.test.ts`.
 *
 * Height is declared in rem (`h-8` / `h-10` / `h-12`) with `box-border`, not
 * derived from padding + line-height. Secondary has a 1px border; without a
 * fixed height that border adds 2px and L lands on 50 instead of the kit's 48.
 * `h-*` is rem (3rem @ 16px = 48) so it still follows `html.wizard-embed`.
 */

export type UiButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost'

/** Kit sizes. The label is the kit's own name: S-32, M-40, L-48. */
export type UiButtonSize = 'S' | 'M' | 'L'

export interface UiButtonClassSet {
  /** Classes for the `<button>` element. */
  root: string
  /** Classes for the label wrapper. */
  label: string
  /** Classes a slotted icon should carry (kit icon box: 24 at L, 16 at M/S). */
  icon: string
}

export interface ResolveUiButtonOptions {
  variant?: UiButtonVariant
  size?: UiButtonSize
  /** Equal-width footer buttons (`flex-1`). */
  block?: boolean
}

/** Shared by every style: layout, radius 8 (`--radius-lg` = 0.5rem), weight. */
const BASE_CLASS = 'ui-button inline-flex items-center justify-center rounded-lg font-medium'

/**
 * Per-size geometry. The kit puts no `gap` on the button: the spacing between a
 * left icon, the label and a right icon comes from the label's own horizontal
 * padding (8 at L, 4 at M/S), which is also what widens the label-only button.
 *
 * Measured, not assumed: `get_metadata` on the Ghost M instance `3760:2297`
 * (the section-card header action) returns 128×40 built as 12 + icon 16 +
 * label frame 88 + 12, and inside that frame the text sits at x=4 with 4 left
 * over on the right — `p-3` plus `px-1`, exactly what this table emits.
 */
export const UI_BUTTON_KIT_SIZE: Record<UiButtonSize, { root: string; label: string; icon: string }> = {
  // 8px padding · 14/16 text · 16px icon → 32px tall, border inside
  S: { root: 'box-border h-8 p-2 text-sm/4', label: 'px-1', icon: 'size-4' },
  // 12px padding · 14/16 text · 16px icon → 40px tall, border inside
  M: { root: 'box-border h-10 p-3 text-sm/4', label: 'px-1', icon: 'size-4' },
  // 12px padding · 16/24 text · 24px icon → 48px tall, border inside
  L: { root: 'box-border h-12 p-3 text-base', label: 'px-2', icon: 'size-6' },
}

/**
 * Per-style colour. Disabled is the kit's `opacity/50` for all four styles.
 * Tokens: `--color-primary` #030213 · `--color-primary-hover` #2d2d39 ·
 * `--color-ink-800` #393947 · `--color-ink-900` #1f1f2e · `--color-ink-300`
 * #ededee · `--color-ink-400` #dfdfe2 · `--color-ink-200` #f3f3f5.
 */
export const UI_BUTTON_KIT_VARIANT: Record<UiButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-ink-300 bg-white text-ink-800 hover:bg-ink-200',
  neutral: 'bg-ink-300 text-ink-900 hover:bg-ink-400',
  ghost: 'text-ink-800 hover:bg-ink-200',
}

/** Kit `opacity/50`, plus the cursor the browser needs to say "not clickable". */
export const UI_BUTTON_KIT_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-50'

export function resolveUiButtonClasses(options: ResolveUiButtonOptions = {}): UiButtonClassSet {
  const { variant = 'primary', size = 'L', block = false } = options

  const geometry = UI_BUTTON_KIT_SIZE[size]

  return {
    root: join([
      BASE_CLASS,
      'transition-colors',
      geometry.root,
      block ? 'flex-1' : '',
      UI_BUTTON_KIT_VARIANT[variant],
      UI_BUTTON_KIT_DISABLED_CLASS,
    ]),
    label: geometry.label,
    icon: geometry.icon,
  }
}

function join(parts: string[]): string {
  return parts.filter(Boolean).join(' ')
}
