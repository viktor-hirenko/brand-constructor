/**
 * Class map for `UiAsyncState.vue`.
 *
 * The kit has no "failed to load" state — open question 4 of
 * `docs/design-audit/dp-15258-ui-kit.md`, answered by building it out of the
 * kit alert (`3461:5236`, Type = Error) plus a kit Secondary S-32 button
 * (`3333:5860`). The wrapper owns nothing but the vertical rhythm.
 *
 * `py-12` (48) is the single value that replaced the three the tree had —
 * `py-8` / `py-12` / `py-16` — and it is the kit spacing step nearest the
 * median of the fourteen call sites.
 */

export const UI_ASYNC_STATE_ROOT_CLASS = 'ui-async-state w-full py-12'

export function resolveUiAsyncStateClasses(): { root: string } {
  return { root: UI_ASYNC_STATE_ROOT_CLASS }
}
