/**
 * Whether «Далі» on the draft concept-edit screen must chain to the External
 * Naming screen instead of saving and returning to the review.
 *
 * DP-15450, Final review 5 (HIGH), her edge case word for word: «Спочатку під
 * час проходження Wizard користувач обирає „Замовити новий концепт", і крок
 * вибору External Naming скіпається. Далі на Final Review користувач натискає
 * „Редагувати" у блоці Concept, повертається на крок вибору концепту і все ж
 * обирає існуючий концепт. Після повернення на Final Review виходить
 * неконсистентний стан: Concept вже обраний, External Naming лишається
 * порожнім, але при цьому доступна кнопка „Відправити в роботу"… → Після
 * вибору концепту автоматично перейти до вибору External Naming.»
 *
 * The chain used to fire only when the brief ALREADY had external picks — which
 * is exactly never in her case, because ordering a concept skips the naming
 * step and leaves it empty. So the rule is now just what she wrote: a library
 * concept that differs from the one the edit started with always goes on to
 * External Naming. An ordered concept (a brief) still returns straight to the
 * review — the wizard skips naming for it too.
 */
export interface DraftConceptCascadeInput {
  /** Concept picked on the screen now; `null` when a brief is ordered instead. */
  nextConceptId: string | null
  /** Concept the brief had when this edit session began. */
  baselineConceptId: string | null
  /** True when the pick is an ordered new concept rather than a library one. */
  isBriefConcept: boolean
}

export function needsExternalNamingReselect(input: DraftConceptCascadeInput): boolean {
  if (input.isBriefConcept) return false
  if (input.nextConceptId == null) return false
  return input.nextConceptId !== input.baselineConceptId
}
