/**
 * Class map for `UiIconButton.vue`.
 *
 * Kit source: Figma `3333:5541` — Style = Solid / Glass × State = Default /
 * Hovered / Disabled × Size = L-48 / S.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3333-5541&m=dev
 *
 * **The `S` variant is named "S - 40px" in Figma and drawn 32×32.** All six S
 * symbols measure 32 with an 8 pad around a 16 glyph (`get_metadata` on
 * `3333:5582`); the label is stale. We follow the geometry, not the name.
 *
 * **Solid is the Secondary button recipe, not a fill.** `get_variable_defs` on
 * `3333:5541` returns `button/secondary/bg/default` #ffffff,
 * `button/secondary/border` #eaeaeb and `button/secondary/content/default`
 * #393947 — the same three slots the kit's Secondary button uses. There is no
 * separate `button/solid/*` family.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance. Same idiom as
 * `ui/uiButton.ts`, `ui/uiBadge.ts` and `ui/uiAlert.ts`.
 *
 * Every length is `rem`-based Tailwind (`size-12`, `p-3`, `size-8`, `p-2`): the
 * wizard is scaled by the single embed knob in `app.css` `html.wizard-embed`,
 * and a `px` box here would silently opt out of it. The two `px` values that
 * stay are the shadow offset and the backdrop blur radius — both are effects
 * measured against the screen, not boxes that have to keep pace with the text,
 * and both are on the ⚠️ list of "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 */

/** Kit Style. `solid` sits on a surface, `glass` sits on top of an image. */
export type UiIconButtonVariant = 'solid' | 'glass'

/** Kit Size: L-48 (24 glyph) and S-32 (16 glyph). See the naming note above. */
export type UiIconButtonSize = 'S' | 'L'

export interface UiIconButtonClasses {
  root: string
  icon: string
}

export interface ResolveUiIconButtonOptions {
  variant?: UiIconButtonVariant
  size?: UiIconButtonSize
}

/**
 * `radius/icon-button` 1000 → `rounded-full`.
 *
 * The explicit `size-*` plus `box-border` is not decoration: phase 1's QA found
 * a Secondary button rendering 50px instead of 48 because the height was left
 * to padding + content and the 1px border pushed it out on both sides. The
 * Solid variant carries that same border, so the box is pinned and the border
 * is drawn inside it.
 */
export const UI_ICON_BUTTON_ROOT_CLASS =
  'ui-icon-button inline-flex shrink-0 box-border items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * L: 48 = 12 + 24 + 12. S: 32 = 8 + 16 + 8 (`spacing/12` and `spacing/8` in the
 * kit variables; `get_metadata` on `3333:5580` / `3333:5582` for the glyph).
 */
export const UI_ICON_BUTTON_SIZE: Record<UiIconButtonSize, { root: string; icon: string }> = {
  L: { root: 'ui-icon-button--l size-12 p-3', icon: 'ui-icon-button__icon size-6 shrink-0' },
  S: { root: 'ui-icon-button--s size-8 p-2', icon: 'ui-icon-button__icon size-4 shrink-0' },
}

/**
 * `button/secondary/border` is #eaeaeb and is written as a hex on purpose.
 * `--color-ink-300` is #ededee, and `docs/STATE.md` "Что дальше" §2 records
 * that the refreshed kit moved this shared neutral to #eaeaeb across the
 * Secondary border, the input border, the accordion, the section card, the
 * alert, the progress bar and the badge. That is one token edit due before
 * phase 11; until it lands, spreading #ededee into new components makes the fix
 * larger. `uiAlert.ts` and `uiBadge.ts` carry the same hex for the same reason.
 *
 * The Solid shadow is `drop-shadow(0px 8px 4px rgba(0,0,0,0.12))` on Default
 * and Hovered and absent on Disabled — so it is switched off explicitly rather
 * than merely faded by the shared `disabled:opacity-50`.
 *
 * Neither state in the kit defines a focus ring; the ring below is carried over
 * from the three call sites that already had one (#c8c7cc ≈ `--color-ink-500`
 * #cacace) so unifying the nine buttons does not quietly drop keyboard focus.
 */
export const UI_ICON_BUTTON_VARIANT: Record<UiIconButtonVariant, string> = {
  solid:
    'ui-icon-button--solid border border-[#eaeaeb] bg-white text-ink-800 shadow-[0_8px_4px_rgba(0,0,0,0.12)] hover:bg-ink-200 focus-visible:ring-ink-500 disabled:shadow-none',
  glass:
    'ui-icon-button--glass bg-[rgba(57,57,71,0.25)] text-white backdrop-blur-[20px] hover:bg-[rgba(57,57,71,0.5)] focus-visible:ring-white/70',
}

export function resolveUiIconButtonClasses(
  options: ResolveUiIconButtonOptions = {}
): UiIconButtonClasses {
  const { variant = 'solid', size = 'L' } = options
  const sizing = UI_ICON_BUTTON_SIZE[size]

  return {
    root: `${UI_ICON_BUTTON_ROOT_CLASS} ${sizing.root} ${UI_ICON_BUTTON_VARIANT[variant]}`,
    icon: sizing.icon,
  }
}
