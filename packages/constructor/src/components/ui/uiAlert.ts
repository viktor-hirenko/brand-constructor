/**
 * Class map for `UiAlert.vue`.
 *
 * Kit source: Figma `3461:5236` — Type = Default / Info / Success / Warning /
 * Error, one box with an icon, a title, a description and an action row.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3461-5237&m=dev
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance. Same idiom as
 * `ui/uiButton.ts` and `ui/uiDivider.ts`.
 *
 * Every length is `rem`-based Tailwind (`p-4`, `gap-3`, `rounded-2xl`,
 * `size-6`): the wizard is scaled by the single embed knob in
 * `app.css` `html.wizard-embed`, and a `px` here would silently opt out of it.
 * See "Железные правила адаптива" in `docs/design-audit/dp-15258-ui-kit.md`.
 */

export type UiAlertType = 'default' | 'info' | 'success' | 'warning' | 'error'

/** Radius 16 (`rounded-2xl`) and padding 16 (`p-4`) are the kit alert values. */
// Stroke inside the box, as the kit draws it: `I5387:91772;4463:9587` is 112
// tall (16 + 80 + 16); a CSS border made it 114.
export const UI_ALERT_ROOT_CLASS = 'ui-alert flex w-full items-start gap-3 rounded-2xl ring-1 ring-inset p-4'
export const UI_ALERT_TEXT_CLASS = 'ui-alert__text flex min-w-0 flex-1 flex-col gap-2'
export const UI_ALERT_TITLE_CLASS = 'ui-alert__title text-lg/6 font-medium text-ink-900'
export const UI_ALERT_DESCRIPTION_CLASS = 'ui-alert__description text-base text-ink-700'
export const UI_ALERT_ACTIONS_CLASS = 'ui-alert__actions mt-1 flex flex-wrap items-center gap-2'
/** Kit icon size for an alert is 24 — `size-6`, not the 16 of a caption row. */
export const UI_ALERT_ICON_CLASS = 'ui-alert__icon size-6 shrink-0'

/**
 * Four of the five tones come straight from the kit semantic slots
 * (`border` + `surface` + `content`). `default` has no semantic tone in Figma:
 * it is the neutral card — `alert/border/default` `#eaeaeb`, which is
 * `--color-ink-300` since the DP-15258 token fix (`app.css`).
 */
export const UI_ALERT_TONES: Record<UiAlertType, { box: string; icon: string }> = {
  default: { box: 'ui-alert--default ring-ink-300 bg-white', icon: 'text-ink-900' },
  info: { box: 'ui-alert--info ring-blue-border bg-blue-surface', icon: 'text-blue-content' },
  success: { box: 'ui-alert--success ring-green-border bg-green-surface', icon: 'text-green-content' },
  warning: { box: 'ui-alert--warning ring-amber-border bg-amber-surface', icon: 'text-amber-content' },
  error: { box: 'ui-alert--error ring-red-border bg-red-surface', icon: 'text-red-content' },
}

export interface UiAlertClasses {
  root: string
  icon: string
  text: string
  title: string
  description: string
  actions: string
}

export function resolveUiAlertClasses(type: UiAlertType = 'default'): UiAlertClasses {
  return {
    root: `${UI_ALERT_ROOT_CLASS} ${UI_ALERT_TONES[type].box}`,
    icon: `${UI_ALERT_ICON_CLASS} ${UI_ALERT_TONES[type].icon}`,
    text: UI_ALERT_TEXT_CLASS,
    title: UI_ALERT_TITLE_CLASS,
    description: UI_ALERT_DESCRIPTION_CLASS,
    actions: UI_ALERT_ACTIONS_CLASS,
  }
}

/**
 * `alert` interrupts a screen reader, `status` waits for a pause. Only the two
 * tones that carry a failure earn the interruption.
 */
export function resolveUiAlertRole(type: UiAlertType = 'default'): 'alert' | 'status' {
  return type === 'error' || type === 'warning' ? 'alert' : 'status'
}
