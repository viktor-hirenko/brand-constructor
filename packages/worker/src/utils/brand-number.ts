const PREFIX = 'New Brand #'

/**
 * Name of a new brief: «New Brand #N» with N one past the largest number a
 * brief carries now.
 *
 * It was «how many briefs + 1»: once a brief is deleted the count drops below
 * the largest number, and the next brief repeats a name that already exists —
 * run 02.10, T-082: after a delete «New Brand #246» was given out a second
 * time; the production copy already had 22 repeated names (H-35).
 *
 * Briefs renamed since (an Internal Naming instead of «New Brand #N») take
 * their number out of the count; the next one may then reuse it — it repeats
 * nothing that exists. `CAST` reads the leading digits, so «New Brand #12
 * copy» counts as 12 and a name with no digits as 0.
 */
export async function nextNewBrandName(db: D1Database): Promise<string> {
  const row = await db
    .prepare(
      `SELECT MAX(CAST(SUBSTR(internal_name, ?) AS INTEGER)) AS max_number
       FROM brands WHERE internal_name LIKE ?`
    )
    .bind(PREFIX.length + 1, `${PREFIX}%`)
    .first<{ max_number: number | null }>()
  return `${PREFIX}${(row?.max_number ?? 0) + 1}`
}
