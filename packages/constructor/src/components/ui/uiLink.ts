/**
 * Class map for `UiLink.vue`.
 *
 * Kit source: Figma `4378:8358` (section Link) → frame `4378:8346`,
 * State = Default / Hovered — the kit draws no other state.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=4378-8358&m=dev
 *
 * **A link is text, not a box.** `get_metadata` on `4378:8345` measures the
 * whole symbol at 48×16: an Icon instance 16×16 at x=0 and the label at x=20 —
 * so gap 4 (`spacing/4`), no padding, no fill, no border, no underline. The
 * height of a link is the height of its line.
 *
 * `get_variable_defs` on `4378:8346` returns exactly four things:
 *   link/default #393947  (= --color-ink-800)
 *   link/hovered #1f1f2e  (= --color-ink-900)
 *   caption/l/medium      14 / 16, weight 500, letterSpacing 0
 *   spacing/4             4
 * Both colours land on our tokens byte for byte, so this component carries no
 * raw hex. `uiAlert.ts`, `uiBadge.ts` and `uiIconButton.ts` briefly had to
 * write #eaeaeb as a raw hex because the kit had moved that shared neutral off
 * `--color-ink-300` — the DP-15258 token fix closed that gap (`app.css`), and
 * the link slots were never affected by it in the first place.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance. Same idiom as
 * `ui/uiButton.ts`, `ui/uiBadge.ts` and `ui/uiIconButton.ts`.
 *
 * Every length is a rem-based Tailwind utility (`gap-1`, `size-4`, `text-sm/4`):
 * the wizard is scaled by the single embed knob in `app.css`
 * `html.wizard-embed`, and a `px` box here would silently opt out of it. The one
 * `px` value that stays is the `tracking` — it is on the ⚠️ list of "Железные
 * правила адаптива" in `docs/design-audit/dp-15258-ui-kit.md`, and open
 * question 7 keeps the current letter-spacing on the вынос screens even though
 * the kit sets it to 0.
 */

export interface UiLinkClasses {
  root: string
  icon: string
}

/**
 * `caption l` medium is 14/16 — reached with the v4 line-height modifier
 * `text-sm/4`, the same way `uiButton.ts` spells it (plain `text-sm` would give
 * the Tailwind default 20, not the kit's 16).
 *
 * `hover:text-ink-900` replaces the `transition-opacity hover:opacity-70` the
 * five call sites shared: the kit states a second colour for Hovered, it does
 * not fade the link.
 *
 * Two things here are ours, not the kit's, and both are deliberate:
 *   - the focus ring. The kit draws no focus state, but all five call sites
 *     carried `focus-visible:ring-2 ring-primary/20` with `rounded-sm`, and
 *     unifying them must not quietly drop keyboard focus. Same call phase 8
 *     made for `UiIconButton`.
 *   - the disabled recipe. The kit has no Disabled link, but this renders a
 *     real `<button>` and a `<button>` can be disabled. `opacity-50` is the
 *     kit's own disabled fade, reused from Button and Icon button rather than
 *     invented.
 */
export const UI_LINK_ROOT_CLASS =
  'ui-link inline-flex shrink-0 items-center gap-1 rounded-sm text-sm/4 font-medium text-ink-800 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-ink-800'

/** Kit `Icon` instance inside the link symbol: 16×16, flush with the text box. */
export const UI_LINK_ICON_CLASS = 'ui-link__icon size-4 shrink-0'

export function resolveUiLinkClasses(): UiLinkClasses {
  return { root: UI_LINK_ROOT_CLASS, icon: UI_LINK_ICON_CLASS }
}
