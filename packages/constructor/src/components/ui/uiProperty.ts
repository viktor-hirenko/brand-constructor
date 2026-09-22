/**
 * Class map for `UiProperty.vue`.
 *
 * Kit source: section `Section card` `3761:2975` → frame Property `3761:2281`,
 * four symbols, all measured one by one rather than taken from the plan:
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3761-2281&m=dev
 *
 *   Type = Icon + Label + Value  `3760:2324`  460 × 44
 *       Icon 20 · gap 8 · [ Label 16 · gap 4 · Value 24 ]
 *   Type = Icon + Value          `3761:2282`  460 × 24
 *       Icon 20 (centred, y = 2) · gap 8 · Value 24 · Link 48×16 pinned right
 *   Type = Label + Value         `4378:8011`  460 × 48
 *       Label 16 · gap 8 · Value 24
 *   Type = Label + Preview       `4131:8340`  460 × 250
 *       Label 16 · gap 8 · preview; two 226-wide columns with gap 8
 *
 * ── The gap between label and value is not one number
 *
 * `Icon + Label + Value` returns `spacing/4` AND `spacing/8` — 4 for the
 * label→value gap (20 − 16), 8 for icon→container (28 − 20). `Label + Value`
 * returns only `spacing/8`, and its value sits at y = 24, so its label→value
 * gap is 8. Two shapes of the same pair, two different gaps; the plan named
 * neither. Verified with `get_variable_defs` on both symbols.
 *
 * ── Colours read off the export, not off the token names
 *
 * The phase-12 chevron wore the wrong token because one node returns several
 * icon colours at once. So these were sampled from the rendered PNG of the
 * drawn section card `5387:91779`: the glyph is (111,111,125) = #6f6f7d, the
 * SAME value as the label — i.e. `section card/content/label`, not a darker
 * content colour — and the value is (31,31,46) = #1f1f2e. Both land on tokens:
 * ink-700 and ink-900. `#5B5B62`, which 52 call sites carried and which the kit
 * does not contain at all, is open question 2 and resolves here by its default.
 *
 * ── The glyphs themselves are NOT changed
 *
 * The kit draws Phosphor; the tree draws its own 48 icons. Swapping the set is
 * phase 23 and is not agreed, so this file decides the icon's SIZE and COLOUR
 * and the call site keeps handing in its own glyph — the same division
 * `UiFieldLabel`, `UiLink` and `UiButton` already use.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function and the markup stays under manual
 * acceptance on prod.
 *
 * ── Letter-spacing
 *
 * Open question 7's default — keep the current look — is unambiguous here and
 * is kept: every property VALUE in review carries `-0.1504px`, every property
 * LABEL carries none. The kit wants 0 on both. Both halves are pinned by the
 * test so the divergence stays visible.
 */

/** The kit's four Property types. */
export type UiPropertyType = 'icon-label-value' | 'icon-value' | 'label-value' | 'label-preview'

/** Icon 20 — `Icon` instance in both icon-bearing symbols. */
export const UI_PROPERTY_ICON_CLASS = 'ui-property__icon size-5 shrink-0 text-ink-700'

/** `caption/l/medium` 14/16 in `section card/content/label` #6f6f7d. */
export const UI_PROPERTY_LABEL_CLASS =
  'ui-property__label text-sm/4 font-medium text-ink-700'

/** `body/regular` 16/24 in `section card/content/value` #1f1f2e. */
export const UI_PROPERTY_VALUE_CLASS =
  'ui-property__value text-base tracking-[-0.1504px] text-ink-900'

/** Row: icon · `spacing/8` · container. The icon-less types have no row gap to spend. */
export const UI_PROPERTY_ROW_CLASS = 'ui-property flex gap-2'

/**
 * `Icon + Value` centres its icon (y = 2 against a 24 line) and its trailing
 * Link (y = 4 against the same); every other type hangs from the top.
 */
export const UI_PROPERTY_ROW_ALIGNMENT: Record<UiPropertyType, string> = {
  'icon-label-value': 'items-start',
  'icon-value': 'items-center',
  'label-value': 'items-start',
  'label-preview': 'items-start',
}

/** Label→value gap: 4 on the icon-bearing pair, 8 on the two label-first types. */
export const UI_PROPERTY_CONTENT_GAP: Record<UiPropertyType, string> = {
  'icon-label-value': 'gap-1',
  'icon-value': 'gap-1',
  'label-value': 'gap-2',
  'label-preview': 'gap-2',
}

export const UI_PROPERTY_CONTENT_BASE_CLASS = 'ui-property__content flex min-w-0 flex-1 flex-col'

export function resolveUiPropertyRowClasses(type: UiPropertyType): string {
  return `${UI_PROPERTY_ROW_CLASS} ${UI_PROPERTY_ROW_ALIGNMENT[type]} ui-property--${type}`
}

export function resolveUiPropertyContentClasses(type: UiPropertyType): string {
  return `${UI_PROPERTY_CONTENT_BASE_CLASS} ${UI_PROPERTY_CONTENT_GAP[type]}`
}
