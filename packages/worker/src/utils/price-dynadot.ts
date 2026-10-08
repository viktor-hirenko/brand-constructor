// Afternic and Sedo by Dynadot's API — the documented way to the same two
// marketplaces, with a key (docs/architecture/domain-price-sync-plan.md,
// «Запасной путь», tried live 08.10: 27 of 27 Afternic prices and 20 of 20
// Sedo prices equal to ours to the dollar). The marketplaces' own addresses
// are nobody's API and Sedo's terms forbid collecting from them, so with a
// key they are asked only where Dynadot cannot answer:
//
//   Dynadot did not answer            — the marketplace's own address, and
//                                       Dynadot is left alone for the run
//   Sedo's price is not Afternic's    — Sedo's own address: Dynadot converts a
//                                       price in euros to dollars and does not
//                                       say so (hitgroove.com: 1 300 EUR came
//                                       as $1 453), and the rate moves daily
//   Afternic has no listing, and the  — Afternic's own address: «make an
//   row is «For sale»                   offer» without a price is no listing
//                                       to Dynadot, and three such nights
//                                       would take «For sale» off
//
// Without a key nothing here asks Dynadot and both are read as before.
//
// What Dynadot answers, as read 08.10:
//   – a search by word: up to ten domains like the one asked, the one itself
//     among them only when it is listed — only the exact name counts
//   – `price_in_usd_pennies`: cents; `0` — offers only, no fixed price
//   – 404 «No premium domain found» — no listing

import { sameAmount } from './price-check-rules'
import {
  PRICE_CHECK_USER_AGENT,
  listingUrl,
  readAfternic,
  readSedo,
  unread,
  type FetchLike,
  type SourceReading,
} from './price-sources'

export type DynadotSource = 'afternic' | 'sedo'

const COMMAND: Record<DynadotSource, string> = { afternic: 'get_afternic_domain', sedo: 'get_sedo_domain' }
const LIST: Record<DynadotSource, string> = { afternic: 'afternic_domain_list', sedo: 'sedo_domain_list' }
const REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** null — not an answer about the domain: a refusal, an error, a shape it does not know. */
export function parseDynadot(source: DynadotSource, domain: string, status: number, body: string): SourceReading | null {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return null
  }
  if (!isRecord(json)) return null
  const reading = (outcome: SourceReading['outcome'], amount: number | null): SourceReading => ({
    source,
    outcome,
    amount,
    currency: amount == null ? null : 'USD',
    minOffer: null,
    url: listingUrl(source, domain),
  })

  if (status === 404 && json.code === 404) return reading('absent', null)
  if (status !== 200 || json.code !== 200 || !isRecord(json.data)) return null
  const list = json.data[LIST[source]]
  if (!Array.isArray(list)) return null

  const item = list.find(i => isRecord(i) && typeof i.domain_name === 'string' && i.domain_name.toLowerCase() === domain)
  if (!item) return reading('absent', null)
  const pennies = (item as Record<string, unknown>).price_in_usd_pennies
  if (typeof pennies !== 'string' || !/^\d+$/.test(pennies)) return null
  const cents = Number(pennies)
  return cents === 0 ? reading('no_fixed_price', null) : reading('listed', cents / 100)
}

export async function readDynadot(
  source: DynadotSource,
  domain: string,
  key: string,
  fetcher: FetchLike
): Promise<SourceReading | null> {
  const query = new URLSearchParams({ domain_name: domain, max_result: '10', currency: 'usd' })
  try {
    const response = await fetcher(`https://api.dynadot.com/restful/v2/aftermarket/${COMMAND[source]}?${query}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'User-Agent': PRICE_CHECK_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    return parseDynadot(source, domain, response.status, await response.text())
  } catch {
    return null
  }
}

/**
 * Requests out per run with a key — Dynadot's and the marketplaces' own
 * together, Namecheap's one aside: nineteen domains at two each, and every
 * request at a marketplace's own address takes the place of a domain, which
 * the next firing asks about. With the database, the night's report and
 * Namecheap a firing stays under the 50 the smallest Cloudflare plan allows.
 */
export const DYNADOT_RUN_REQUESTS = 38

export interface AskState {
  fetch: FetchLike
  /** No key — both marketplaces are read at their own addresses, as before. */
  dynadotKey?: string
  /** Marketplaces that refused at their own address: not asked again in this run. */
  refused: Set<string>
  /** Dynadot did not answer about this marketplace: not asked again in this run. */
  dynadotOff: Set<DynadotSource>
  /** Requests out the run may still make; absent — one row, no limit. */
  budget?: { left: number }
  /** Requests made, by the way they went — for the server log: the stage keeps no other trace of it. */
  out: { dynadot: number; direct: number }
}

class OutOfBudget extends Error {}

/**
 * What Afternic and Sedo ask for a domain. `null` — the run's allowance ended
 * midway: nothing is known of the domain, and it is asked about again at the
 * next firing rather than written down as unread.
 */
export async function askAfternicAndSedo(
  domain: string,
  state: AskState,
  options: { confirmAbsent: boolean }
): Promise<[SourceReading, SourceReading] | null> {
  const spend = () => {
    if (!state.budget) return
    if (state.budget.left <= 0) throw new OutOfBudget()
    state.budget.left--
  }
  // A refusal ends the run for that marketplace: no retries, no way round.
  const direct = async (source: DynadotSource): Promise<SourceReading> => {
    if (state.refused.has(source)) return unread(source, domain, 'skipped after a refusal')
    spend()
    state.out.direct++
    const answer = await (source === 'afternic' ? readAfternic : readSedo)(domain, state.fetch)
    if (answer.refused) state.refused.add(source)
    return answer.reading
  }
  const viaDynadot = async (source: DynadotSource): Promise<SourceReading | null> => {
    if (!state.dynadotKey || state.dynadotOff.has(source)) return null
    spend()
    state.out.dynadot++
    const reading = await readDynadot(source, domain, state.dynadotKey, state.fetch)
    if (!reading) state.dynadotOff.add(source)
    return reading
  }

  if (!state.dynadotKey) return Promise.all([direct('afternic'), direct('sedo')])

  try {
    // One at a time: an ordinary Dynadot account is allowed one request at once.
    let afternic = await viaDynadot('afternic')
    if (!afternic || (afternic.outcome === 'absent' && options.confirmAbsent)) afternic = await direct('afternic')

    let sedo = await viaDynadot('sedo')
    const afternicPrice = afternic.outcome === 'listed' && afternic.currency === 'USD' ? afternic.amount : null
    if (!sedo || (sedo.outcome === 'listed' && !sameAmount(sedo.amount, afternicPrice))) sedo = await direct('sedo')

    return [afternic, sedo]
  } catch (error) {
    if (error instanceof OutOfBudget) return null
    throw error
  }
}
