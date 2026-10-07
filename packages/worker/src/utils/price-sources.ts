// Readers of the three marketplaces that show what a domain's owner asks for
// it (docs/architecture/domain-price-sync-plan.md). None of the addresses is a
// documented API, so every reader is strict: an answer it does not recognise
// to the letter is «unread», never a number and never «no listing». The
// samples the parsers were written against are in tests/fixtures/price-sources.
//
// Units, each checked against the price the marketplace shows on its page:
//   Afternic  — `buyNow` in millionths of a dollar
//   Sedo      — `price` in cents, with its own currency (hitgroove.com: EUR)
//   Namecheap — `price` in dollars
//
// A refusal (403 / 429) is not retried and not worked around: the caller stops
// asking that marketplace for the rest of the run.

import type { NamingPriceOutcome, NamingPriceSource } from '@brand-constructor/shared'

export const PRICE_SOURCES = ['afternic', 'sedo', 'namecheap'] as const satisfies readonly NamingPriceSource[]

/**
 * The server says who it is. Without a User-Agent Afternic and Sedo answer a
 * Cloudflare worker 403 (phase 0 of the plan); a browser's name would be a lie.
 */
export const PRICE_CHECK_USER_AGENT =
  'brand-constructor-price-check/1.0 (internal tool; one request per domain per day)'

const REQUEST_TIMEOUT_MS = 10_000

export interface SourceReading {
  source: NamingPriceSource
  outcome: NamingPriceOutcome
  /** Dollars when `listed`; the amount in `currency` when the price is not in USD. */
  amount: number | null
  currency: string | null
  minOffer: number | null
  url: string | null
  /** Why it is unread — for the log only. */
  note?: string
}

export interface SourceAnswer {
  reading: SourceReading
  /** 403 / 429: stop asking this marketplace in this run. */
  refused: boolean
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** `Chamboo.com/`, `https://chamboo.com` → `chamboo.com`; null when it is not a domain. */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null
  const domain = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null
}

const LISTING_URL: Record<NamingPriceSource, (domain: string) => string> = {
  afternic: domain => `https://www.afternic.com/domain/${domain}`,
  sedo: domain => `https://sedo.com/search/details/?domain=${domain}`,
  namecheap: domain => `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
}

export function listingUrl(source: NamingPriceSource, domain: string): string {
  return LISTING_URL[source](domain)
}

export function unread(source: NamingPriceSource, domain: string, note: string): SourceReading {
  return { source, outcome: 'unread', amount: null, currency: null, minOffer: null, url: listingUrl(source, domain), note }
}

function absent(source: NamingPriceSource, domain: string): SourceReading {
  return { source, outcome: 'absent', amount: null, currency: null, minOffer: null, url: listingUrl(source, domain) }
}

function isRefusal(status: number): boolean {
  return status === 403 || status === 429
}

/** A whole positive number of the marketplace's smallest unit. */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// ── Afternic ────────────────────────────────────────────────────────────────

const AFTERNIC_DATA_OPEN = '<script id="__NEXT_DATA__" type="application/json">'

/**
 * `location` is the redirect target: a domain Afternic does not list goes to
 * `/_error`, one that only has a GoDaddy «make an offer» page — to `/forsale/…`.
 */
export function parseAfternic(domain: string, status: number, location: string | null, body: string): SourceReading {
  const source = 'afternic'
  if (status >= 300 && status < 400) {
    if (location === '/_error') return absent(source, domain)
    if (location === `/forsale/${domain}`) {
      return {
        source,
        outcome: 'no_fixed_price',
        amount: null,
        currency: null,
        minOffer: null,
        url: `https://www.afternic.com/forsale/${domain}`,
      }
    }
    return unread(source, domain, `redirect to ${location ?? 'nowhere'}`)
  }
  if (status !== 200) return unread(source, domain, `http ${status}`)

  const start = body.indexOf(AFTERNIC_DATA_OPEN)
  const end = start === -1 ? -1 : body.indexOf('</script>', start)
  if (end === -1) return unread(source, domain, 'no page data')
  const data = parseJson(body.slice(start + AFTERNIC_DATA_OPEN.length, end))
  const props = isRecord(data) && isRecord(data.props) ? data.props.pageProps : undefined
  const profile = isRecord(props) ? props.profile : undefined
  if (!isRecord(profile)) return unread(source, domain, 'no profile')
  if (typeof profile.domain !== 'string' || profile.domain.toLowerCase() !== domain) {
    return unread(source, domain, 'another domain in the answer')
  }
  if (profile.isForSale === false) return absent(source, domain)
  if (profile.isForSale !== true) return unread(source, domain, 'isForSale is not a boolean')

  const minOffer = isPositiveInteger(profile.minBid) ? profile.minBid / 1_000_000 : null
  const url = listingUrl(source, domain)
  if (profile.buyNow == null || profile.buyNow === 0) {
    return { source, outcome: 'no_fixed_price', amount: null, currency: null, minOffer, url }
  }
  if (!isPositiveInteger(profile.buyNow)) return unread(source, domain, 'buyNow is not a whole number')
  const amount = profile.buyNow / 1_000_000
  // A price under a dollar means the unit is not what this reader assumes.
  if (amount < 1) return unread(source, domain, 'buyNow is too small for millionths of a dollar')
  return {
    source,
    outcome: 'listed',
    amount,
    currency: 'USD',
    minOffer: minOffer != null && minOffer < amount ? minOffer : null,
    url,
  }
}

// ── Sedo ────────────────────────────────────────────────────────────────────

export function parseSedo(domain: string, status: number, body: string): SourceReading {
  const source = 'sedo'
  const data = parseJson(body)
  if (status === 404) {
    return isRecord(data) && data.status === 404 ? absent(source, domain) : unread(source, domain, 'http 404, not Sedo’s own')
  }
  if (status !== 200) return unread(source, domain, `http ${status}`)
  if (!isRecord(data)) return unread(source, domain, 'not JSON')
  if (typeof data.name !== 'string' || data.name.toLowerCase() !== domain) {
    return unread(source, domain, 'another domain in the answer')
  }
  const type = data.domainPriceType
  if (typeof type !== 'string' || type === '') return unread(source, domain, 'no price type')

  const block = data[type]
  const options = isRecord(block) && isRecord(block.priceOptions) ? block.priceOptions : undefined
  const currencyName = options && isRecord(options.currency) ? options.currency.name : undefined
  const currency = typeof currencyName === 'string' && currencyName !== '' ? currencyName.toUpperCase() : null
  const minOffer = options && isPositiveInteger(options.priceMin) ? options.priceMin / 100 : null
  const url = listingUrl(source, domain)

  if (type !== 'buynow') {
    // Offers only (cashdisco.com: `bidrange`) — listed, with no price to compare.
    return { source, outcome: 'no_fixed_price', amount: null, currency, minOffer, url }
  }
  if (!options || !isPositiveInteger(options.price) || currency == null) {
    return unread(source, domain, 'buynow without a price or a currency')
  }
  const amount = options.price / 100
  if (currency !== 'USD') {
    return { source, outcome: 'no_fixed_price', amount, currency, minOffer: null, url }
  }
  return {
    source,
    outcome: 'listed',
    amount,
    currency,
    minOffer: minOffer != null && minOffer < amount ? minOffer : null,
    url,
  }
}

// ── Namecheap ───────────────────────────────────────────────────────────────

/** One answer covers every domain asked; a domain it does not mention is unread. */
export function parseNamecheap(domains: string[], status: number, body: string): Map<string, SourceReading> {
  const source = 'namecheap'
  const out = new Map<string, SourceReading>()
  const fail = (note: string) => {
    for (const domain of domains) out.set(domain, unread(source, domain, note))
    return out
  }
  if (status !== 200) return fail(`http ${status}`)
  const data = parseJson(body)
  if (!isRecord(data) || data.type !== 'ok' || !Array.isArray(data.data)) return fail('not the expected JSON')

  const entries = new Map<string, Record<string, unknown>>()
  for (const entry of data.data) {
    if (isRecord(entry) && typeof entry.domain === 'string') entries.set(entry.domain.toLowerCase(), entry)
  }
  for (const domain of domains) {
    const entry = entries.get(domain)
    const url = listingUrl(source, domain)
    if (!entry) {
      out.set(domain, unread(source, domain, 'not in the answer'))
    } else if (entry.status === 'notfound') {
      out.set(domain, absent(source, domain))
    } else if (entry.status !== 'active') {
      out.set(domain, unread(source, domain, `status ${String(entry.status)}`))
    } else if (entry.type !== 'buynow') {
      out.set(domain, { source, outcome: 'no_fixed_price', amount: null, currency: null, minOffer: null, url })
    } else if (typeof entry.price !== 'number' || !Number.isFinite(entry.price) || entry.price <= 0) {
      out.set(domain, unread(source, domain, 'buynow without a price'))
    } else {
      out.set(domain, { source, outcome: 'listed', amount: entry.price, currency: 'USD', minOffer: null, url })
    }
  }
  return out
}

// ── Requests ────────────────────────────────────────────────────────────────

interface RawAnswer {
  status: number
  location: string | null
  body: string
}

async function request(fetcher: FetchLike, url: string): Promise<RawAnswer | { error: string }> {
  try {
    const response = await fetcher(url, {
      headers: { 'User-Agent': PRICE_CHECK_USER_AGENT, Accept: '*/*' },
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    return {
      status: response.status,
      location: response.headers.get('location'),
      body: await response.text(),
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export async function readAfternic(domain: string, fetcher: FetchLike): Promise<SourceAnswer> {
  const raw = await request(fetcher, `https://www.afternic.com/domain/${encodeURIComponent(domain)}`)
  if ('error' in raw) return { reading: unread('afternic', domain, raw.error), refused: false }
  return {
    reading: parseAfternic(domain, raw.status, raw.location, raw.body),
    refused: isRefusal(raw.status),
  }
}

export async function readSedo(domain: string, fetcher: FetchLike): Promise<SourceAnswer> {
  const raw = await request(fetcher, `https://sedo.com/api/domain-details/information/${encodeURIComponent(domain)}`)
  if ('error' in raw) return { reading: unread('sedo', domain, raw.error), refused: false }
  return { reading: parseSedo(domain, raw.status, raw.body), refused: isRefusal(raw.status) }
}

export async function readNamecheap(
  domains: string[],
  fetcher: FetchLike
): Promise<{ readings: Map<string, SourceReading>; refused: boolean }> {
  const raw = await request(
    fetcher,
    `https://aftermarket.namecheapapi.com/domain/status?domain=${domains.map(encodeURIComponent).join(',')}`
  )
  if ('error' in raw) {
    return { readings: new Map(domains.map(d => [d, unread('namecheap', d, raw.error)])), refused: false }
  }
  return { readings: parseNamecheap(domains, raw.status, raw.body), refused: isRefusal(raw.status) }
}
