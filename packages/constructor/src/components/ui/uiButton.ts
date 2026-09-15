/**
 * Class maps for `UiButton.vue`.
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
 * `ui/statusPillBadge.ts`.
 *
 * ── Two recipes, on purpose ───────────────────────────────────────────────────
 * `kit: false` (the default) reproduces the pre-kit primary/secondary pair byte
 * for byte, because four modal shells rendered it and DP-15258 phase 1 was only
 * allowed to change the wizard footer. **Phase 6 (2026-09-15) converted the last
 * of those shells — this branch now has zero consumers** and stays only so that
 * phase 10 can retire it together with the raw `<button>`s of the review
 * screens. Until then it is dead code with a date on it, not a fallback.
 * `kit: true` is Figma `3333:5860` and nothing else.
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
  /** Classes for the label wrapper. Empty string when the recipe needs none. */
  label: string
  /** Classes a slotted icon should carry (kit icon box: 24 at L, 16 at M/S). */
  icon: string
}

export interface ResolveUiButtonOptions {
  variant?: UiButtonVariant
  size?: UiButtonSize
  /** `true` → Figma `3333:5860`. `false` → the pre-kit look (default). */
  kit?: boolean
  /** Equal-width footer buttons (`flex-1`). */
  block?: boolean
  /** An icon slot is filled — the pre-kit recipe needs an explicit gap for it. */
  hasIcon?: boolean
}

/** Shared by both recipes: layout, radius 8 (`--radius-lg` = 0.5rem), weight. */
const BASE_CLASS = 'ui-button inline-flex items-center justify-center rounded-lg font-medium'

// ─── Kit recipe — Figma 3333:5860 ─────────────────────────────────────────────

/**
 * Per-size geometry. The kit puts no `gap` on the button: the spacing between a
 * left icon, the label and a right icon comes from the label's own horizontal
 * padding (8 at L, 4 at M/S), which is also what widens the label-only button.
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

// ─── Pre-kit recipe — retired by phases 4, 6 and 10 ───────────────────────────

/**
 * The exact class strings `UiButton.vue` shipped before DP-15258. Pinned in a
 * test while the four modals still rendered them; kept pinned until phase 10
 * deletes the branch, so that "dead" and "quietly edited" stay distinguishable.
 * `tracking-[-0.3125px]` is kept deliberately: the kit's letter-spacing is 0,
 * but open question 7 says carry-over screens keep their current rendering,
 * because dropping tracking changes line wrapping everywhere at once.
 */
export const UI_BUTTON_LEGACY_BASE_CLASS =
  'ui-button inline-flex items-center justify-center rounded-[8px] p-3 text-[1rem] font-medium leading-6 tracking-[-0.3125px]'

export const UI_BUTTON_LEGACY_VARIANT: Record<UiButtonVariant, string> = {
  primary:
    'bg-[#030213] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
  secondary:
    'border border-black/10 bg-white text-[#0a0a0a] transition-colors hover:bg-black/[0.02] disabled:opacity-40',
  // Neutral and ghost exist only in the kit. Asking for them without `kit`
  // would be a silent downgrade to a look the kit does not have, so they fall
  // back to the closest pre-kit surface rather than inventing colours.
  neutral:
    'border border-black/10 bg-white text-[#0a0a0a] transition-colors hover:bg-black/[0.02] disabled:opacity-40',
  ghost: 'text-[#0a0a0a] transition-colors hover:bg-black/[0.02] disabled:opacity-40',
}

/** The pre-kit recipe has no label padding, so an icon needs a real gap. */
export const UI_BUTTON_LEGACY_ICON_GAP_CLASS = 'gap-2'
export const UI_BUTTON_LEGACY_ICON_CLASS = 'size-4'

export function resolveUiButtonClasses(options: ResolveUiButtonOptions = {}): UiButtonClassSet {
  const { variant = 'primary', size = 'L', kit = false, block = false, hasIcon = false } = options

  const blockClass = block ? 'flex-1' : ''

  if (!kit) {
    return {
      root: join([
        UI_BUTTON_LEGACY_BASE_CLASS,
        blockClass,
        hasIcon ? UI_BUTTON_LEGACY_ICON_GAP_CLASS : '',
        UI_BUTTON_LEGACY_VARIANT[variant],
      ]),
      label: '',
      icon: UI_BUTTON_LEGACY_ICON_CLASS,
    }
  }

  const geometry = UI_BUTTON_KIT_SIZE[size]

  return {
    root: join([
      BASE_CLASS,
      'transition-colors',
      geometry.root,
      blockClass,
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
