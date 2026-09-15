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
 * `caption m` — 12/16, weight 500. `tracking` stays at the product's current
 * −0.3125px rather than the kit's 0: open question 7 keeps the rendering of
 * carry-over phases untouched, and this is one of them.
 */
export const UI_BADGE_LABEL_CLASS =
  'ui-badge__label inline-flex items-center justify-center px-1 text-xs font-medium leading-4 tracking-[-0.3125px] whitespace-nowrap'

/** Kit icon size inside a badge is 16 — the caption row, not the alert's 24. */
export const UI_BADGE_ICON_CLASS = 'ui-badge__icon inline-flex size-4 shrink-0 items-center justify-center'

/**
 * `badge/bg/*` and `badge/content/*`, straight off `3453:1619`.
 *
 * Neutral's `#eaeaeb` is written as a hex on purpose. The kit neutral ramp in
 * `@theme` jumps `--color-ink-300` `#ededee` → `--color-ink-400` `#dfdfe2`, and
 * the refreshed kit moved this slot between them. Reaching for `bg-ink-300`
 * would spread `#ededee` — the very value `docs/STATE.md` "Что дальше" §2 says
 * to stop spreading — so the badge carries the kit value directly, the same way
 * `uiAlert.ts` carries it for the `default` tone.
 */
export const UI_BADGE_TONES: Record<UiBadgeTone, string> = {
  neutral: 'ui-badge--neutral bg-[#eaeaeb] text-ink-800',
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

export function resolveUiBadgeClasses(tone: UiBadgeTone = 'neutral'): UiBadgeClasses {
  return {
    root: `${UI_BADGE_ROOT_CLASS} ${UI_BADGE_TONES[tone]}`,
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
