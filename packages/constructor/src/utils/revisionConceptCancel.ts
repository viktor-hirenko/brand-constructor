/**
 * What «Скасувати» on the Author's revision concept screen does to the
 * external namings.
 *
 * The concept screen only ever clears the names on «Далі» with a different
 * concept, and it captures them first (`baselineExternalCaptured`). So:
 *  - captured → put the captured names back (the chained flow may have
 *    cleared or changed them);
 *  - not captured → the names were never touched here; leave them alone.
 *
 * Before 30.09 the view restored the baseline unconditionally, and an
 * uncaptured baseline is `[]` — «Редагувати» → «Скасувати» wiped the Author's
 * External Naming.
 *
 * Returns the ids to write, or `null` for «do not touch».
 */
export function externalIdsOnConceptCancel(draft: {
  baselineExternalCaptured: boolean
  baselineExternalIds: string[]
}): string[] | null {
  return draft.baselineExternalCaptured ? [...draft.baselineExternalIds] : null
}
