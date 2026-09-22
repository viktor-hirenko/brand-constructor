/**
 * Concept card visuals — Figma `3715:5610`, State = Default / Hovered /
 * Selected / Preview, brought to the kit in DP-15258 phase 17.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3715-5610&m=dev
 *
 * Measured off the kit, not copied from the plan:
 *   box        162×162, `radius/concept-card` 16, content clipped
 *   Default    image + `concept-card/overlay` rgba(0,0,0,0.45), **no border**
 *   Hovered    image, no overlay, still **no border**
 *   Selected   2px `concept-card/border` #030213 outside, a 4px white ring
 *              inside, no overlay, check mark top-left
 *   Preview    no border, no overlay, eye mark top-right
 *
 * **The default border is gone.** Every non-selected state in the kit draws the
 * bare image; the 1px `rgba(3,2,19,0.1)` frame this file used to hand out came
 * from the older `2201:6968` node and is not in `3715:5610` at all.
 *
 * The two marks are not bespoke: they are the kit's icon button, Solid S-32
 * (`3715:5555` and `3715:5627` both resolve to `button/secondary/bg/default`
 * #ffffff, `button/secondary/border` #eaeaeb and drop-shadow
 * 0 8 4 rgba(0,0,0,0.12) — the same three slots `ui/uiIconButton.ts` already
 * serves). They are rendered through `resolveUiIconButtonClasses({ decorative })`
 * because the card itself is the button and a button cannot nest in a button.
 */

/** `concept-card/border` — Selected only. Default and Hovered have no border. */
export const CONCEPT_CARD_BORDER_COLOR_SELECTED = '#030213'

/** `concept-card/overlay` — the dim that Default carries and Hovered drops. */
export const CONCEPT_CARD_DIM_OVERLAY_COLOR = 'rgba(0,0,0,0.45)'

/**
 * Bottom title legibility gradient, measured off the kit's own "Concept name"
 * row: `bg-gradient-to-b from-[rgba(0,0,0,0)] to-[95%] to-[rgba(0,0,0,0.75)]`.
 *
 * Two things moved with the kit. The gradient lives **on the name row** (a
 * 56-tall strip: 16 padding + 24 line + 16 padding) rather than being stretched
 * across the whole card, and it has no third stop — the extra `0%…70%`
 * transparent run this file used to carry only existed to fake the same effect
 * from a full-card box.
 */
export const CONCEPT_CARD_TITLE_GRADIENT =
  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 95%)'
