/**
 * While a brief is `in_work` the teams are already working from its orders, so
 * the author may look at an order and may drop it (by picking from the library)
 * but may not create a new one or change its answers — the server refuses that
 * too (`checkInWorkEdit`, brief-orders plan phase 1).
 */
export function isBriefOrderLocked(brandStatus: string | null | undefined): boolean {
  return brandStatus === 'in_work'
}
