/**
 * Class map for `SegmentedControl.vue`.
 *
 * Kit source: Figma `3706:6076` (Segmented control) over `3706:5980`
 * (Segment: State = Active / Inactive / Hovered / Disabled).
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3706-6076&m=dev
 *
 * Measured off the kit, not copied from the plan:
 *   control     `segmented-control/bg` #eaeaeb, `radius/button` 8,
 *               `spacing/4` padding — 4 + 32 + 4 = the 40 the drawn step 2
 *               instance measures (`4016:7708`, 219×40, segments 106×32 and
 *               105×32)
 *   segment     `radius/segment` 6, `spacing/8` box padding plus `spacing/4`
 *               on the label → 12 horizontal, 8 vertical, height 32
 *   text        `caption/l` 14/16 weight 400, letterSpacing 0
 *   Active      `segmented-control/segment/bg` #ffffff,
 *               drop-shadow(0 8 5 rgba(0,0,0,0.1)),
 *               content `#1f1f2e`
 *   Inactive    no fill, content `#6f6f7d`
 *   Hovered     **no fill either** — the kit only darkens the label to `#1f1f2e`
 *   Disabled    no fill, content `#95959d`
 *
 * What stood here before: a `#ececf0` box (a hex the kit does not contain at
 * all — phase 12 found that out), padding 2, a 28-tall segment, `#030213`
 * active ink and `#6b6b6b` inactive ink, and no Hovered/Disabled at all —
 * divergences row 21.
 *
 * The label's `tracking-[-0.3125px]` is dropped: the kit gives 0 and this
 * element is rewritten here, the same call phases 11 and 12 made for the
 * fields and the accordion. It is not row 48 (the badge) or row 46 (the edit
 * flow section label) — those stay put until the owner says otherwise.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance.
 *
 * Every length is `rem`-based Tailwind (`p-1`, `px-3`, `py-2`, `rounded-lg`,
 * `rounded-md`, `text-sm/4`): the wizard is scaled by the single embed knob in
 * `app.css` `html.wizard-embed`, and a `px` box here would silently opt out of
 * it. The shadow offset stays in px — it is an effect measured against the
 * screen, and on the ⚠️ list of "Железные правила адаптива".
 */

export type SegmentState = 'active' | 'inactive' | 'disabled'

/**
 * `radius/button` 8 → `rounded-lg`, `spacing/4` → `p-1`.
 * `self-start` keeps the control at its content width inside the column flex
 * of every screen that shows it; `inline-flex` alone would still stretch.
 */
export const SEGMENTED_CONTROL_ROOT_CLASS =
  'segmented-control inline-flex self-start items-center rounded-lg bg-ink-300 p-1'

/**
 * `radius/segment` 6 → `rounded-md`; 12 horizontal (8 box + 4 label) and 8
 * vertical padding around a 16 line box → 32 tall.
 */
export const SEGMENT_BASE_CLASS =
  'segmented-control__segment inline-flex items-center justify-center rounded-md px-3 py-2 text-sm/4 font-normal whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500'

/** State = Active. The shadow is the kit's `drop-shadow(0 8 5 rgba(0,0,0,0.1))`. */
export const SEGMENT_ACTIVE_CLASS =
  'segmented-control__segment--active bg-white text-ink-900 shadow-[0_8px_5px_rgba(0,0,0,0.1)]'

/**
 * State = Inactive, with State = Hovered folded into its `hover:`. The kit
 * gives Hovered no fill of its own — only the label goes from
 * `segmented-control/segment/content/inactive` to `…/hovered`, which is the
 * same #1f1f2e the Active label uses.
 */
export const SEGMENT_INACTIVE_CLASS =
  'segmented-control__segment--inactive text-ink-700 hover:text-ink-900 cursor-pointer'

/** State = Disabled: no fill, `segmented-control/segment/content/disabled` #95959d. */
export const SEGMENT_DISABLED_CLASS =
  'segmented-control__segment--disabled text-ink-600 cursor-not-allowed'

export interface SegmentedControlClasses {
  root: string
  segment: (state: SegmentState) => string
}

const SEGMENT_STATE_CLASS: Record<SegmentState, string> = {
  active: SEGMENT_ACTIVE_CLASS,
  inactive: SEGMENT_INACTIVE_CLASS,
  disabled: SEGMENT_DISABLED_CLASS,
}

export function resolveSegmentedControlClasses(): SegmentedControlClasses {
  return {
    root: SEGMENTED_CONTROL_ROOT_CLASS,
    segment: (state: SegmentState) => `${SEGMENT_BASE_CLASS} ${SEGMENT_STATE_CLASS[state]}`,
  }
}

/**
 * Disabled wins over selected: a disabled segment that also happens to be the
 * current value must not keep the white Active plate, because the kit's
 * Disabled symbol has no plate.
 */
export function resolveSegmentState(options: {
  selected: boolean
  disabled: boolean
}): SegmentState {
  if (options.disabled) return 'disabled'
  return options.selected ? 'active' : 'inactive'
}
