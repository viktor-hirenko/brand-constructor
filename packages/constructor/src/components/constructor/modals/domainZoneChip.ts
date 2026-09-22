/**
 * Domain-zone chips in the two brief-order modals («Які доменні зони можна
 * розглядати?») — DP-15258 phase 17, divergences row 24.
 *
 * The kit has **no component** for these. The designer drew them as raw frames
 * on `5562:49236`, twelve of them, and measuring that node is the only source
 * there is:
 *   box      radius 8, padding 12 horizontal / 8 vertical → 32 tall
 *   border   1px `accordion/border/default` #eaeaeb (= --color-ink-300)
 *   text     `caption/l` 14/16 weight 500
 *   row gap  4 both ways
 *
 * **No selected state is drawn** — all twelve frames are identical, so the
 * chosen-chip recipe below is ours and stays ours (phase 11 reached the same
 * conclusion and left the chips alone; the Segment `3706:5980` it pointed at as
 * the nearest neighbour turned out to be a different box: 6 radius, no border).
 * It is kept as close to the kit's vocabulary as possible: the accent is
 * `--color-primary` #030213 and the wash is that same accent at 5%, so no hex
 * is written here.
 *
 * The border stays 1px in **both** states on purpose. Before this it was 2px in
 * both — matching the kit on the unselected chip while leaving the selected one
 * at 2 would make every chip jump 2px sideways as you toggle it.
 *
 * The designer's own `#1a1a1a` ink is not reproduced: that hex is not in the
 * kit at all (divergences row 17), and its kit value is `#1f1f2e`.
 *
 * Lengths are `rem`-based Tailwind — the wizard is scaled by the single embed
 * knob in `app.css` `html.wizard-embed`.
 */

/** Shared box: radius 8, 12/8 padding, `caption/l` 14/16 weight 500. */
export const DOMAIN_ZONE_CHIP_BASE_CLASS =
  'domain-zone-chip inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm/4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500'

/** Ours, not the kit's: the accent border over a 5% wash of the same accent. */
export const DOMAIN_ZONE_CHIP_SELECTED_CLASS =
  'domain-zone-chip--selected border-primary bg-primary/5 text-primary'

/** The drawn state: `accordion/border/default` #eaeaeb over nothing. */
export const DOMAIN_ZONE_CHIP_DEFAULT_CLASS =
  'domain-zone-chip--default border-ink-300 text-ink-900 hover:bg-ink-200'

export function resolveDomainZoneChipClass(selected: boolean): string {
  return `${DOMAIN_ZONE_CHIP_BASE_CLASS} ${
    selected ? DOMAIN_ZONE_CHIP_SELECTED_CLASS : DOMAIN_ZONE_CHIP_DEFAULT_CLASS
  }`
}

/** `gap: 4` on the wrapping row — the kit draws the chips 4 apart, not 8. */
export const DOMAIN_ZONE_CHIP_ROW_CLASS = 'flex flex-wrap gap-1'
