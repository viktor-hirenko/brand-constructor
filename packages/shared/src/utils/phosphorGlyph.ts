/**
 * Phosphor glyphs — DP-15859.
 *
 * Both apps take their icons from `@phosphor-icons/core`: one SVG file per
 * glyph per weight, imported as text (`…/regular/tag.svg?raw`). That package
 * was chosen over `@phosphor-icons/vue` by measuring the deployed bundles: a
 * Vue component carries all six weights of its glyph, so the wizard's set
 * would have added ~40 kB gzip to its entry chunk; one weight per file keeps
 * the glyphs smaller than the Figma exports they replace.
 *
 * Every file in the package is `<svg viewBox="0 0 256 256" fill="currentColor">`
 * with nothing but `<path d="…"/>` children (checked across all 1512 glyphs of
 * the `regular` and `fill` folders), so the path data is the whole glyph.
 */

/** The box every Phosphor glyph is drawn in. */
export const PHOSPHOR_VIEW_BOX = '0 0 256 256';

/**
 * The `d` of every path in a Phosphor SVG file, in document order.
 *
 * Throws on anything that is not a Phosphor file, so a wrong import fails the
 * build's tests instead of rendering an empty square.
 */
export function phosphorPaths(svg: string): string[] {
  if (!svg.includes(`viewBox="${PHOSPHOR_VIEW_BOX}"`)) {
    throw new Error('phosphorPaths: not a Phosphor SVG (expected a 256 box)');
  }
  const paths = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (paths.length === 0) {
    throw new Error('phosphorPaths: the SVG has no path');
  }
  return paths;
}
