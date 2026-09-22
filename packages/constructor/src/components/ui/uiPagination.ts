/**
 * Class map for `UiPagination.vue`.
 *
 * Kit source: Figma `3715:5756` (Pagination) over `3715:5725` (Dot: State =
 * Selected / Default / Hovered).
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3715-5786&m=dev
 *
 * Measured, not copied from the plan (`get_metadata` on `3715:5756` and
 * `get_variable_defs` on `3715:5786`):
 *   pill        100×36, `spacing/12` padding, `radius/pagination` 1000,
 *               `pagination/bg` #39394740 → rgba(57,57,71,0.25), backdrop blur 20
 *   dots row    `spacing/8` gap — the five drawn dots sit at x 0 / 20 / 36 / 52 / 68
 *               with widths 12 / 8 / 8 / 8 / 8, i.e. exactly 8 between every pair
 *   Selected    12, `pagination/dot/selected` #ffffff
 *   Default      8, `pagination/dot/default` #ffffff80, own backdrop blur 10
 *   Hovered      8, `pagination/dot/hovered` #ffffff — the size does NOT change
 *                on hover, only the alpha goes to 1
 *
 * What stood here before (`ConceptPreviewSlider.vue:360`) was the last carrier
 * of the pre-kit glass tone `rgba(68,67,86,0.3)` — divergences row 20.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance. Same idiom as
 * `ui/uiIconButton.ts`, `ui/uiBadge.ts` and `ui/uiToggle.ts`.
 *
 * Every length is `rem`-based Tailwind (`p-3`, `gap-2`, `size-3`, `size-2`):
 * the wizard is scaled by the single embed knob in `app.css`
 * `html.wizard-embed`, and a `px` box here would silently opt out of it. The
 * two `px` values that stay are the backdrop blur radii — an effect measured
 * against the screen, not a box that has to keep pace with the text, and on the
 * ⚠️ list of "Железные правила адаптива" in `docs/design-audit/dp-15258-ui-kit.md`.
 *
 * The pill fill repeats the literal `rgba(57,57,71,0.25)` that
 * `ui/uiIconButton.ts` uses for Glass rather than minting a token: the kit
 * spells it `pagination/bg` here and `button/glass/bg/default` there, and
 * `app.css` names tokens by role — a shared "glass" role is a decision for the
 * owner, not something to invent inside a phase (divergences row 5).
 */

/**
 * `radius/pagination` 1000 → `rounded-full`. Padding `spacing/12` → `p-3`, so
 * the pill measures 12 + 12 + 12 = 36 tall around the 12 of a selected dot.
 */
export const UI_PAGINATION_ROOT_CLASS =
  'ui-pagination pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-full p-3 bg-[rgba(57,57,71,0.25)] backdrop-blur-[20px]'

/** `spacing/8` between dots — the kit gap, not the 6 this used to render. */
export const UI_PAGINATION_DOTS_CLASS =
  'ui-pagination__dots flex items-center justify-center gap-2'

/** Shared by all three dot states; the state classes add size and fill. */
export const UI_PAGINATION_DOT_BASE_CLASS =
  'ui-pagination__dot shrink-0 rounded-full transition-[background-color,width,height] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'

/** State = Selected: 12, `pagination/dot/selected` #ffffff. */
export const UI_PAGINATION_DOT_SELECTED_CLASS =
  'ui-pagination__dot--selected size-3 bg-white'

/**
 * State = Default: 8, `pagination/dot/default` #ffffff80, own `backdrop-blur-[10px]`.
 * State = Hovered is the same 8 with the alpha at 1 — `hover:bg-white`.
 */
export const UI_PAGINATION_DOT_DEFAULT_CLASS =
  'ui-pagination__dot--default size-2 bg-white/50 backdrop-blur-[10px] hover:bg-white'

export interface UiPaginationClasses {
  root: string
  dots: string
  dot: (selected: boolean) => string
}

export function resolveUiPaginationClasses(): UiPaginationClasses {
  return {
    root: UI_PAGINATION_ROOT_CLASS,
    dots: UI_PAGINATION_DOTS_CLASS,
    dot: (selected: boolean) =>
      `${UI_PAGINATION_DOT_BASE_CLASS} ${
        selected ? UI_PAGINATION_DOT_SELECTED_CLASS : UI_PAGINATION_DOT_DEFAULT_CLASS
      }`,
  }
}
