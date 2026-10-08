import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Afternic, Sedo and Namecheap as a `fetch`, answering in the shape of the
 * live samples in tests/fixtures/price-sources — so the tests of the price
 * check run the real readers, not a stand-in for them.
 */

const FIXTURES = fileURLToPath(new URL('../fixtures/price-sources/', import.meta.url))

export function fixture(name: string): string {
  return readFileSync(`${FIXTURES}${name}`, 'utf8')
}

export type Marketplace = 'afternic' | 'sedo' | 'namecheap'

export interface Listing {
  /** Dollars; `offers` — no fixed price; `lander` — GoDaddy's «make an offer» page. */
  afternic?: number | 'offers' | 'lander'
  /** Dollars; `{ eur }` — a fixed price in euros; `offers` — offers only. */
  sedo?: number | { eur: number } | 'offers'
  namecheap?: number | 'offers'
}

export interface MarketplaceCall {
  marketplace: Marketplace | 'registrar' | 'dynadot-afternic' | 'dynadot-sedo'
  url: string
  domains: string[]
  userAgent: string | null
  /** The Authorization header — Dynadot's key travels there and nowhere else. */
  authorization?: string | null
}

/** What Dynadot's API can do instead of answering. */
export type DynadotFault = 'down' | 'unauthorized' | 'limited' | 'garbled' | 'unreachable'

/** Dollars Dynadot shows for a euro (08.10: 1 300 EUR came as $1 453). */
export const DYNADOT_EUR_RATE = 1.1177

const AFTERNIC_PAGE = fixture('afternic-listing.html')
const SEDO_BUYNOW = fixture('sedo-buynow-usd.json')
const SEDO_EUR = fixture('sedo-buynow-eur.json')
const SEDO_OFFERS = fixture('sedo-offers-only.json')
const SEDO_NOT_FOUND = fixture('sedo-not-found.json')

function afternicPage(domain: string, dollars: number): string {
  return AFTERNIC_PAGE.replaceAll('chamboo.com', domain)
    .replace('"buyNow":2695000000', `"buyNow":${Math.round(dollars * 1_000_000)}`)
    .replace('"minBid":2695000000', `"minBid":${Math.round(dollars * 1_000_000)}`)
}

function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name)
}

export function createMarketplaces() {
  /** domain → what each marketplace lists; a missing marketplace has no listing. */
  const listings = new Map<string, Listing>()
  const calls: MarketplaceCall[] = []
  /** Marketplaces that answer 403 to everything. */
  const refusing = new Set<Marketplace>()
  /** Marketplaces the network does not reach. */
  const unreachable = new Set<Marketplace>()
  /** Marketplaces answering 200 with a page of another shape. */
  const garbled = new Set<Marketplace>()
  /** domain → the registrar's «available»; a missing domain makes the registrar fail. */
  const registrar = new Map<string, boolean>()
  /** Dynadot answers like this to every request; per marketplace — `dynadotFaults`. */
  const dynadot: { fault: DynadotFault | null } = { fault: null }
  const dynadotFaults = new Map<'afternic' | 'sedo', DynadotFault>()

  /** As Dynadot answered live (08.10): a search by word, the domain itself only when it is listed. */
  function dynadotAnswer(source: 'afternic' | 'sedo', domain: string): Response {
    const fault = dynadotFaults.get(source) ?? dynadot.fault
    if (fault === 'unreachable') throw new TypeError('fetch failed')
    if (fault === 'down') return new Response('{"code":500,"message":"Internal Server Error"}', { status: 500 })
    if (fault === 'unauthorized') return new Response('{"code":401,"message":"Unauthorized"}', { status: 401 })
    if (fault === 'limited') return new Response('{"code":429,"message":"Too many requests"}', { status: 429 })
    if (fault === 'garbled') return new Response('<html><body>Maintenance</body></html>')

    const item = (name: string, dollars: number) => ({
      domain_name: name,
      domain_name_display: name,
      price_in_usd_pennies: String(Math.round(dollars * 100)),
      is_fast_transfer: 'true',
      price_in_target_currency: `$${dollars.toFixed(2)}`,
    })
    const listed = listings.get(domain)
    const exact: ReturnType<typeof item>[] = []
    if (source === 'afternic' && typeof listed?.afternic === 'number') exact.push(item(domain, listed.afternic))
    if (source === 'sedo' && listed?.sedo !== undefined) {
      const sedo = listed.sedo
      if (typeof sedo === 'number') exact.push(item(domain, sedo))
      else if (sedo === 'offers') exact.push(item(domain, 0))
      else exact.push(item(domain, Math.round(sedo.eur * DYNADOT_EUR_RATE)))
    }
    // Sedo with nothing to show answers 404; Afternic always has domains like the one asked.
    if (source === 'sedo' && exact.length === 0) {
      return new Response('{"code":404,"message":"Not Found","error":{"description":"No premium domain found."}}', { status: 404 })
    }
    const alike = [item(`my${domain}`, 4321), item(domain.replace('.', '-shop.'), 999)]
    return new Response(JSON.stringify({ code: 200, message: 'Success', data: { [`${source}_domain_list`]: [...exact, ...alike] } }))
  }

  function answer(marketplace: Marketplace, respond: () => Response): Response {
    if (unreachable.has(marketplace)) throw new TypeError('fetch failed')
    if (refusing.has(marketplace)) return new Response('<html><title>403 Forbidden</title></html>', { status: 403 })
    if (garbled.has(marketplace)) return new Response('<html><body>We have redesigned!</body></html>')
    return respond()
  }

  async function fetch(input: string, init?: RequestInit): Promise<Response> {
    const url = new URL(String(input))
    const call = (marketplace: MarketplaceCall['marketplace'], domains: string[]) =>
      calls.push({ marketplace, url: url.href, domains, userAgent: header(init, 'user-agent') })

    if (url.hostname === 'www.afternic.com') {
      const domain = decodeURIComponent(url.pathname.replace('/domain/', ''))
      call('afternic', [domain])
      return answer('afternic', () => {
        const listed = listings.get(domain)?.afternic
        if (listed === undefined) return new Response('/_error', { status: 307, headers: { location: '/_error' } })
        if (listed === 'lander') {
          return new Response(`/forsale/${domain}`, { status: 307, headers: { location: `/forsale/${domain}` } })
        }
        if (listed === 'offers') return new Response(afternicPage(domain, 0).replace('"minBid":0', '"minBid":500000000'))
        return new Response(afternicPage(domain, listed))
      })
    }

    if (url.hostname === 'sedo.com') {
      const domain = decodeURIComponent(url.pathname.replace('/api/domain-details/information/', ''))
      call('sedo', [domain])
      return answer('sedo', () => {
        const listed = listings.get(domain)?.sedo
        if (listed === undefined) return new Response(SEDO_NOT_FOUND, { status: 404 })
        if (listed === 'offers') return new Response(SEDO_OFFERS.replaceAll('cashdisco.com', domain))
        if (typeof listed === 'object') {
          return new Response(
            SEDO_EUR.replaceAll('hitgroove.com', domain).replace('"price":130000', `"price":${Math.round(listed.eur * 100)}`)
          )
        }
        return new Response(
          SEDO_BUYNOW.replaceAll('chamboo.com', domain).replace('"price":269500', `"price":${Math.round(listed * 100)}`)
        )
      })
    }

    if (url.hostname === 'aftermarket.namecheapapi.com') {
      const domains = (url.searchParams.get('domain') ?? '').split(',')
      call('namecheap', domains)
      return answer('namecheap', () => {
        const data = domains.map(domain => {
          const listed = listings.get(domain)?.namecheap
          if (listed === undefined) return { domain, status: 'notfound' }
          if (listed === 'offers') return { domain, status: 'active', type: 'offer', username: 'sedo' }
          return { domain, fast_transfer: true, price: listed, retail: listed + 10, status: 'active', type: 'buynow', username: 'sedo' }
        })
        return new Response(JSON.stringify({ type: 'ok', data }))
      })
    }

    if (url.hostname === 'api.dynadot.com') {
      const source = url.pathname.endsWith('/get_afternic_domain') ? 'afternic' : url.pathname.endsWith('/get_sedo_domain') ? 'sedo' : null
      if (!source) throw new Error(`a Dynadot command the price check must never call: ${url.pathname}`)
      const domain = url.searchParams.get('domain_name') ?? ''
      calls.push({
        marketplace: `dynadot-${source}`,
        url: url.href,
        domains: [domain],
        userAgent: header(init, 'user-agent'),
        authorization: header(init, 'authorization'),
      })
      return dynadotAnswer(source, domain)
    }

    const check = /\/domains\/([^/]+)\/check$/.exec(url.pathname)
    if (url.hostname === 'api.pananames.com' && check) {
      const domain = decodeURIComponent(check[1])
      call('registrar', [domain])
      const available = registrar.get(domain)
      if (available === undefined) return new Response('boom', { status: 500 })
      const prices = { currency: 'USD', register: 15, renew: 15, transfer: 15, redeem: 80 }
      return new Response(
        JSON.stringify({
          data: { domain, domain_idn: domain, available, premium: false, prices, promo_prices: null, claim: false, add_req: false },
        })
      )
    }

    throw new Error(`unexpected fetch in test: ${url.href}`)
  }

  return {
    listings,
    calls,
    refusing,
    unreachable,
    garbled,
    registrar,
    dynadot,
    dynadotFaults,
    fetch,
    /** Requests to one marketplace, as the domains asked. */
    asked: (marketplace: MarketplaceCall['marketplace']) =>
      calls.filter(c => c.marketplace === marketplace).map(c => c.domains.join(',')),
  }
}

export type Marketplaces = ReturnType<typeof createMarketplaces>
