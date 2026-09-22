/**
 * Class map for `UiToggle.vue`.
 *
 * Kit source: Figma `3764:6920` — State = Selected (`3764:6918`) / Unselected
 * (`3764:6919`). Those two are the whole kit: there is no Hovered and no
 * Disabled variant, so this map has no hover and no disabled recipe either.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3764-6920&m=dev
 *
 * ── The numbers were measured off the export, not read off the plan ──────────
 * The plan (and the divergence list, rows 12 and 22) called the kit toggle
 * "56×28, thumb inset 2, travel 30". It is not. Both symbols export as
 *
 *   <svg width="48" height="24"> … <circle cx="12|36" cy="12" r="10"/>
 *
 * so the kit is **48×24 with a ⌀20 thumb, inset 2 on every side, travel 24**.
 * Confirmed a second way: every one of the seven `Toggle` instances on the
 * drawn Visual Components screen `5382:36912` is laid out 48×24 — the component
 * is never stretched. Both of the toggles this primitive replaces were 56×28
 * with a ⌀24 thumb, so neither of them was "already correct"; both shrink.
 *
 * Colors come from the same export's `fill`, not from token names (the lesson
 * phase 12 paid for): track `#030213` on / `#eaeaeb` off, thumb `#ffffff`.
 * Those are `--color-primary` and `--color-ink-300` byte for byte, so no hex
 * appears below. `toggle/bg/unselected` is the same `#eaeaeb` the token fix on
 * `phase/11` put into `--color-ink-300`.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * `h-6 w-12` is 1.5rem × 3rem, the thumb `size-5` is 1.25rem, the inset
 * `top-0.5 left-0.5` is 0.125rem and the travel `translate-x-6` is 1.5rem — so
 * all four numbers follow the single embed knob (`app.css` `html.wizard-embed`).
 * No `px` length may appear here; see "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts` and `ui/uiAccordion.ts`.
 */

export interface UiToggleClassSet {
  /** The track: the element that carries the on/off fill. */
  track: string
  /** The thumb, absolutely positioned inside the track. */
  thumb: string
}

/**
 * 48×24, fully rounded (`radius/control` 1000). `relative` because the thumb is
 * positioned against it; `shrink-0` because both call sites put the toggle at
 * the end of a flex row that can run out of width.
 */
export const UI_TOGGLE_TRACK_BASE_CLASS =
  'ui-toggle relative h-6 w-12 shrink-0 rounded-full transition-colors'

/** `toggle/bg/selected` #030213 — already `--color-primary`. */
export const UI_TOGGLE_TRACK_ON_CLASS = 'bg-primary'

/** `toggle/bg/unselected` #eaeaeb — already `--color-ink-300`. */
export const UI_TOGGLE_TRACK_OFF_CLASS = 'bg-ink-300'

/**
 * ⌀20 thumb, inset 2 from the left and from the top: (24 − 20) / 2 = 2, so the
 * same 0.125rem centres it vertically and parks it at the left edge.
 * `toggle/thumb` is #ffffff.
 */
export const UI_TOGGLE_THUMB_BASE_CLASS =
  'ui-toggle__thumb pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform'

/** Travel 24 = thumb centre 12 → 36 in the export. 1.5rem at a 16px root. */
export const UI_TOGGLE_THUMB_ON_CLASS = 'translate-x-6'

/** Off is the resting position, so there is nothing to translate. */
export const UI_TOGGLE_THUMB_OFF_CLASS = 'translate-x-0'

export function resolveUiToggleClasses(checked: boolean): UiToggleClassSet {
  return {
    track: `${UI_TOGGLE_TRACK_BASE_CLASS} ${
      checked ? UI_TOGGLE_TRACK_ON_CLASS : UI_TOGGLE_TRACK_OFF_CLASS
    }`,
    thumb: `${UI_TOGGLE_THUMB_BASE_CLASS} ${
      checked ? UI_TOGGLE_THUMB_ON_CLASS : UI_TOGGLE_THUMB_OFF_CLASS
    }`,
  }
}
