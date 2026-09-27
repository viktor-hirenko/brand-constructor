/**
 * Class map for `UiBadge.vue` and `UiStatusDot.vue`.
 *
 * Kit source: Figma `3453:1619` — Color = Neutral / Green / Amber / Red / Blue
 * / Purple, one pill with an optional 16 icon on each side.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3453-1619&m=dev
 * Status indicator: `3761:1914` — a 6×6 dot, `radius/status-indicator` 1000.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance. Same idiom as
 * `ui/uiAlert.ts` and `ui/uiButton.ts`.
 *
 * Every length is `rem`-based Tailwind (`p-1`, `px-1`, `size-4`): the wizard is
 * scaled by the single embed knob in `app.css` `html.wizard-embed`, and a `px`
 * here would silently opt out of it. The one exception is the 6×6 dot, which is
 * a hairline-class mark rather than a box that has to follow the text — see
 * `UI_STATUS_DOT_CLASS`. See "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 */

export type UiBadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple'

/**
 * `pill` is the kit symbol above, and five of the six call sites draw it.
 *
 * `chip` is the sixth: the country tokens inside the GEO field, and it is a
 * different paint on purpose. `5409:36376` on the drawn step 1 measures 50×24
 * with **`radius` 4, not the badge's 1000**, on `bg/alt-4` **#dfdfe2**, not
 * `badge/bg/neutral` #eaeaeb. Everything else is the symbol's: `spacing/4` on
 * the box, another on the label, `caption/m/medium` 12/16 in
 * `badge/content/neutral` #393947, a 16 glyph in the `Icon right` slot.
 *
 * The owner found this on acceptance, and the reason it was missed is worth
 * keeping: these two numbers came back in the very first read of the screen and
 * were never compared against the code, because the chips were not on the list
 * of things being checked. A screen is walked, not sampled.
 *
 * Only `neutral` has a chip — the kit draws no coloured one — so the shape
 * replaces the tone's fill rather than layering over it. Two `background-color`
 * utilities on one element are resolved by Tailwind's own output order, not by
 * the order they are written; that is how the accordion lost its selected
 * border.
 */
export type UiBadgeShape = 'pill' | 'chip'

/**
 * Kit geometry: `radius/badge` 1000 (`rounded-full`), `spacing/4` padding on
 * the box, another `spacing/4` on the label. 4 + 16 + 4 = the 24 height the
 * symbols are drawn at.
 *
 * **No border.** All six tones ship `content` + `bg` and nothing else — this is
 * what closes open question 8: there is no border slot to extrapolate for
 * purple, because the other five do not have one either.
 */
export const UI_BADGE_ROOT_CLASS =
  'ui-badge inline-flex shrink-0 items-center justify-center rounded-full p-1'

/**
 * The GEO chip's own box: same 4 of padding and the same 24 height, but
 * `rounded-sm` (0.25rem = the drawn 4) and `bg/alt-4` — see `UiBadgeShape`.
 * The fill rides `ink-400`, which is `#dfdfe2` in the theme already; no new
 * value is introduced here.
 */
export const UI_BADGE_CHIP_ROOT_CLASS =
  'ui-badge ui-badge--chip inline-flex shrink-0 items-center justify-center rounded-sm bg-ink-400 p-1 text-ink-800'

/**
 * `spacing/4` between neighbouring chips — the chips sit at x = 0 and x = 54 in
 * a 102-wide group of 50 and 48. The field's own `spacing/8` stays between that
 * group and the search placeholder, which opens at 114 against a group ending
 * at 106.
 */
export const UI_BADGE_CHIP_GROUP_CLASS = 'ui-badge-chip-group flex items-center gap-1'

/**
 * `caption m` — 12/16, weight 500, letter-spacing **0**: `3453:1619` states it
 * outright, and the kit states the same zero for all five of its type styles.
 * The −0.3125px that stood here since phase 7 was open question 7's default,
 * and the owner has now closed it (divergences row 48).
 *
 * One line, six places: the country chips on step 1, «Обраний концепт» on step
 * 2, «Обраний пакет» on step 5, the variant name on step 7, and both the brief
 * status and the section marker on step 8.
 */
export const UI_BADGE_LABEL_CLASS =
  'ui-badge__label inline-flex items-center justify-center px-1 text-xs font-medium leading-4 whitespace-nowrap'

/** Kit icon size inside a badge is 16 — the caption row, not the alert's 24. */
export const UI_BADGE_ICON_CLASS = 'ui-badge__icon inline-flex size-4 shrink-0 items-center justify-center'

/**
 * `badge/bg/*` and `badge/content/*`, straight off `3453:1619`.
 *
 * Neutral's `badge/bg/neutral` `#eaeaeb` rides `--color-ink-300` — the
 * DP-15258 token fix moved that shared neutral from `#ededee` to the kit's
 * `#eaeaeb` (`app.css`).
 */
export const UI_BADGE_TONES: Record<UiBadgeTone, string> = {
  neutral: 'ui-badge--neutral bg-ink-300 text-ink-800',
  green: 'ui-badge--green bg-green-bg text-green-content',
  amber: 'ui-badge--amber bg-amber-bg text-amber-content',
  red: 'ui-badge--red bg-red-bg text-red-content',
  blue: 'ui-badge--blue bg-blue-bg text-blue-content',
  purple: 'ui-badge--purple bg-purple-bg text-purple-content',
}

export interface UiBadgeClasses {
  root: string
  label: string
  icon: string
}

export function resolveUiBadgeClasses(
  tone: UiBadgeTone = 'neutral',
  shape: UiBadgeShape = 'pill'
): UiBadgeClasses {
  // The chip carries its own fill and its own text colour, so the tone is not
  // appended — one `background-color` utility on the element, never two.
  return {
    root:
      shape === 'chip'
        ? UI_BADGE_CHIP_ROOT_CLASS
        : `${UI_BADGE_ROOT_CLASS} ${UI_BADGE_TONES[tone]}`,
    label: UI_BADGE_LABEL_CLASS,
    icon: UI_BADGE_ICON_CLASS,
  }
}

/**
 * Status indicator `3761:1914` — 6×6, fully round, `status indicator/info`
 * `#3a5bc7`. That hex is the same value as `badge/content/blue`, so the dot
 * rides the existing token instead of repeating the literal.
 *
 * 6px is the one length here that stays in `px`: the dot is a mark, not a box
 * that has to keep pace with a text run, and below the 11px embed floor a
 * `0.375rem` dot would round down to 4px and read as dirt on the line. Same
 * reasoning as the hairline `border` exemption in the adaptive rules.
 */
export const UI_STATUS_DOT_CLASS =
  'ui-status-dot inline-block size-[6px] shrink-0 rounded-full bg-blue-content'
