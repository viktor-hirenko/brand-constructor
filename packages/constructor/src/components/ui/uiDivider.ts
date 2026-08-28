/**
 * Class map for `UiDivider.vue`.
 *
 * Kit source: Figma `3446:5230` — Color = Default × Type = Horizontal
 * (`3446:5229`) / Vertical (`5259:79966`). Both are a single stroke in
 * `divider/default` #ededee; the symbols themselves are 0 tall / 0 wide, so the
 * rule is a border, not a filled box.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3446-5230&m=dev
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts` and `ui/statusPillBadge.ts`.
 *
 * ── The border stays 1px, on purpose ─────────────────────────────────────────
 * Everything else in the wizard is `rem` so that it follows the single embed
 * knob (`app.css` `html.wizard-embed`). A hairline rule is the documented
 * exception: at an 11px root, `border-[0.0625rem]` resolves to 0.69px and the
 * browser renders grey mush instead of a line. See "Железные правила адаптива"
 * in `docs/design-audit/dp-15258-ui-kit.md`.
 */

export type UiDividerOrientation = 'horizontal' | 'vertical'

/**
 * `border-0` first, then one side back on: `<hr>` ships a UA border on all four
 * sides, and Tailwind Preflight replaces it with a full `border-top` — either
 * way the reset has to be explicit or the vertical variant draws two lines.
 */
export const UI_DIVIDER_BASE_CLASS = 'ui-divider shrink-0 border-0 border-solid border-ink-300'

export const UI_DIVIDER_ORIENTATION: Record<UiDividerOrientation, string> = {
  horizontal: 'w-full border-t',
  vertical: 'self-stretch border-l',
}

export function resolveUiDividerClasses(orientation: UiDividerOrientation = 'horizontal'): string {
  return `${UI_DIVIDER_BASE_CLASS} ${UI_DIVIDER_ORIENTATION[orientation]}`
}
