/**
 * Step 7 (Visual Components) — how a variant is named on screen, and the one
 * compatibility rule that exists between variants.
 *
 * Both live here because they are the same fact seen twice. The accordion calls
 * a variant "Type C", and the design states its only incompatibility in exactly
 * those words: Header Type C conflicts with Tabbar Type B
 * (Figma `4016:3217`, section UXUI-2554).
 *
 * The letter is the variant's position in the list the user sees — 1st → A.
 * It is deliberately NOT `component_variants.variant_number`: in production that
 * column drifted away from the displayed order (Tabbar "Type 2" carries number
 * 6, Header "Type 4" carries 6 as well), and the rule — which used to key on it —
 * silently stopped matching anything. A rule stated in terms of what the user
 * sees can only break if what the user sees changes.
 *
 * The database still names variants `Type 1 … Type 4`; the letters are a display
 * mapping applied here, so no production data is rewritten to render this screen.
 */

/** Prefix of the caption under an incompatible variant row. */
export const INCOMPATIBLE_CAPTION = 'Несумісний з обраним'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Minimal shape this module needs from a `ComponentVariant`. */
export interface VariantLike {
  id: string
}

export interface DisplayVariant {
  id: string
  /** A, B, C… — position in the displayed list. */
  letter: string
  /** What the accordion prints on the row and in the badge: `Type C`. */
  label: string
}

/** Letter for a zero-based position. Past Z falls back to the plain number. */
export function variantLetter(index: number): string {
  return LETTERS[index] ?? String(index + 1)
}

/** Turns the list as sorted for display into rows carrying letter + label. */
export function buildDisplayVariants(variants: readonly VariantLike[]): DisplayVariant[] {
  return variants.map((variant, index) => {
    const letter = variantLetter(index)
    return { id: variant.id, letter, label: `Type ${letter}` }
  })
}

/** One side of an incompatibility rule: a component type and a variant letter. */
export interface VariantRef {
  typeId: string
  letter: string
}

export const INCOMPATIBLE_PAIRS: ReadonlyArray<readonly [VariantRef, VariantRef]> = [
  [
    { typeId: 'ct_header', letter: 'C' },
    { typeId: 'ct_tabbar', letter: 'B' },
  ],
]

export interface CompatibilityContext {
  /** Display rows per component type id, in accordion order. */
  displayByType: Record<string, DisplayVariant[]>
  /** Selected variant id per component type id. */
  selections: Record<string, string>
  /** Type captions as shown in the accordion header: `ct_header` → `Header`. */
  typeNames: Record<string, string>
}

export interface VariantConflict {
  typeIdA: string
  variantIdA: string
  /** Ready-made `Header Type C` for the warning block. */
  titleA: string
  typeIdB: string
  variantIdB: string
  titleB: string
}

function letterOf(ctx: CompatibilityContext, typeId: string, variantId: string): string | null {
  return ctx.displayByType[typeId]?.find(v => v.id === variantId)?.letter ?? null
}

/** `Header Type C` — the type caption plus the variant label. */
function titleOf(ctx: CompatibilityContext, typeId: string, letter: string): string {
  const typeName = ctx.typeNames[typeId] ?? typeId
  return `${typeName} Type ${letter}`.trim()
}

function matchesSelection(ctx: CompatibilityContext, ref: VariantRef): string | null {
  const selected = ctx.selections[ref.typeId]
  if (!selected) return null
  return letterOf(ctx, ref.typeId, selected) === ref.letter ? selected : null
}

/** Every rule whose both sides are currently selected. */
export function findVariantConflicts(ctx: CompatibilityContext): VariantConflict[] {
  const conflicts: VariantConflict[] = []

  for (const [a, b] of INCOMPATIBLE_PAIRS) {
    const variantIdA = matchesSelection(ctx, a)
    const variantIdB = matchesSelection(ctx, b)
    if (!variantIdA || !variantIdB) continue

    conflicts.push({
      typeIdA: a.typeId,
      variantIdA,
      titleA: titleOf(ctx, a.typeId, a.letter),
      typeIdB: b.typeId,
      variantIdB,
      titleB: titleOf(ctx, b.typeId, b.letter),
    })
  }

  return conflicts
}

/** True when this type takes part in one of the given conflicts. */
export function typeHasConflict(conflicts: readonly VariantConflict[], typeId: string): boolean {
  return conflicts.some(c => c.typeIdA === typeId || c.typeIdB === typeId)
}

/**
 * Caption under a variant row — `Несумісний з обраним Header Type C`, or `null`
 * when this variant conflicts with nothing that is currently selected.
 *
 * Computed against the OTHER types' selections, so the caption is on the row
 * before the user picks it, not only afterwards.
 */
export function variantIncompatibilityCaption(
  ctx: CompatibilityContext,
  typeId: string,
  variantId: string
): string | null {
  const letter = letterOf(ctx, typeId, variantId)
  if (!letter) return null

  for (const [a, b] of INCOMPATIBLE_PAIRS) {
    for (const [side, other] of [
      [a, b],
      [b, a],
    ] as const) {
      if (side.typeId !== typeId || side.letter !== letter) continue
      if (!matchesSelection(ctx, other)) continue
      return `${INCOMPATIBLE_CAPTION} ${titleOf(ctx, other.typeId, other.letter)}`
    }
  }

  return null
}
