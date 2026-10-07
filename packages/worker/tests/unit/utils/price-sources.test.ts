import { describe, expect, it } from 'vitest'
import {
  PRICE_CHECK_USER_AGENT,
  normalizeDomain,
  parseAfternic,
  parseNamecheap,
  parseSedo,
  readAfternic,
  readNamecheap,
  readSedo,
} from '../../../src/utils/price-sources'
import { createMarketplaces, fixture } from '../../helpers/marketplaces'

/**
 * The marketplace readers (docs/architecture/domain-price-sync-plan.md). The
 * addresses are nobody's API: a number read in the wrong unit, or a refusal
 * read as «no listing», would put a wrong price or a false «Sold» in front of
 * the customer. Every sample is a live answer of 07.10.2026.
 */

describe('Afternic: a listing page', () => {
  const page = fixture('afternic-listing.html')

  it('the price is in dollars, not in millionths of one', () => {
    expect(parseAfternic('chamboo.com', 200, null, page)).toMatchObject({
      outcome: 'listed',
      amount: 2695,
      currency: 'USD',
      url: 'https://www.afternic.com/domain/chamboo.com',
    })
  })

  it('a minimum offer below the price is kept apart from the price (hitgroove.com: 2 000 / 500)', () => {
    const hitgroove = page
      .replaceAll('chamboo.com', 'hitgroove.com')
      .replace('"buyNow":2695000000', '"buyNow":2000000000')
      .replace('"minBid":2695000000', '"minBid":500000000')
    expect(parseAfternic('hitgroove.com', 200, null, hitgroove)).toMatchObject({ amount: 2000, minOffer: 500 })
  })

  it('google.com — a redirect to the error page: no listing', () => {
    expect(parseAfternic('google.com', 307, '/_error', '/_error')).toMatchObject({ outcome: 'absent', amount: null })
  })

  it('boomico.com — a redirect to GoDaddy’s offer page: listed, no fixed price', () => {
    expect(parseAfternic('boomico.com', 307, '/forsale/boomico.com', '')).toMatchObject({
      outcome: 'no_fixed_price',
      amount: null,
    })
  })

  it('no «buy now» price: listed with no fixed price, never a zero', () => {
    const offers = page.replace('"buyNow":2695000000', '"buyNow":0')
    expect(parseAfternic('chamboo.com', 200, null, offers)).toMatchObject({ outcome: 'no_fixed_price', amount: null })
  })

  it.each([
    ['a refusal', 403, null, '<html><title>403 Forbidden</title></html>'],
    ['a server error', 500, null, ''],
    ['a redirect somewhere else', 307, '/login', ''],
    ['a page without the data', 200, null, '<html><body>chamboo.com</body></html>'],
    ['broken data', 200, null, page.replace('"profile":{', '"profile":{{')],
    ['another domain in the data', 200, null, page.replaceAll('chamboo.com', 'other.com')],
    ['a price that is not a whole number', 200, null, page.replace('"buyNow":2695000000', '"buyNow":"2695"')],
    ['a price too small for the unit', 200, null, page.replace('"buyNow":2695000000', '"buyNow":2695')],
  ])('%s is unread — not a price and not «no listing»', (_name, status, location, body) => {
    expect(parseAfternic('chamboo.com', status, location, body)).toMatchObject({ outcome: 'unread', amount: null })
  })
})

describe('Sedo: the domain details', () => {
  it('the price is in dollars, not in cents', () => {
    expect(parseSedo('chamboo.com', 200, fixture('sedo-buynow-usd.json'))).toMatchObject({
      outcome: 'listed',
      amount: 2695,
      currency: 'USD',
    })
  })

  it('hitgroove.com — a price in euros is no fixed price in dollars', () => {
    expect(parseSedo('hitgroove.com', 200, fixture('sedo-buynow-eur.json'))).toMatchObject({
      outcome: 'no_fixed_price',
      amount: 1300,
      currency: 'EUR',
    })
  })

  it('cashdisco.com — offers only: no fixed price, the minimum offer kept apart', () => {
    expect(parseSedo('cashdisco.com', 200, fixture('sedo-offers-only.json'))).toMatchObject({
      outcome: 'no_fixed_price',
      amount: null,
      minOffer: 2000,
    })
  })

  it('pixellia.com, google.com — Sedo’s own 404: no listing', () => {
    expect(parseSedo('google.com', 404, fixture('sedo-not-found.json'))).toMatchObject({ outcome: 'absent' })
  })

  it.each([
    ['a refusal', 403, '<!DOCTYPE html><html>Attention Required!</html>'],
    ['a 404 that is not Sedo’s', 404, '<html>Not Found</html>'],
    ['a page instead of JSON', 200, '<html></html>'],
    ['another domain in the answer', 200, fixture('sedo-buynow-usd.json').replaceAll('chamboo.com', 'other.com')],
    ['a zero price', 200, fixture('sedo-buynow-usd.json').replace('"price":269500', '"price":0')],
    ['no currency', 200, fixture('sedo-buynow-usd.json').replace('"currency":{"id":3,"name":"usd"},', '')],
    ['no price type', 200, fixture('sedo-buynow-usd.json').replace('"domainPriceType":"buynow",', '')],
  ])('%s is unread', (_name, status, body) => {
    expect(parseSedo('chamboo.com', status, body)).toMatchObject({ outcome: 'unread', amount: null })
  })
})

describe('Namecheap: one answer for every domain', () => {
  const domains = ['chamboo.com', 'cashdisco.com', 'hitgroove.com', 'boomico.com', 'pixellia.com', 'google.com']
  const readings = parseNamecheap(domains, 200, fixture('namecheap.json'))

  it('its own price, in dollars — not the «retail» one', () => {
    expect(readings.get('chamboo.com')).toMatchObject({ outcome: 'listed', amount: 2685, currency: 'USD' })
    expect(readings.get('hitgroove.com')).toMatchObject({ outcome: 'listed', amount: 1460 })
    expect(readings.get('boomico.com')).toMatchObject({ outcome: 'listed', amount: 3300 })
  })

  it('google.com — «notfound»: no listing', () => {
    expect(readings.get('google.com')).toMatchObject({ outcome: 'absent', amount: null })
  })

  it('a domain the answer does not mention is unread, not «no listing»', () => {
    const more = parseNamecheap([...domains, 'darkmont.com'], 200, fixture('namecheap.json'))
    expect(more.get('darkmont.com')).toMatchObject({ outcome: 'unread' })
  })

  it('a zero or missing price, an unknown status, a refusal — all unread', () => {
    const body = (entry: object) => JSON.stringify({ type: 'ok', data: [{ domain: 'chamboo.com', ...entry }] })
    const one = (status: number, text: string) => parseNamecheap(['chamboo.com'], status, text).get('chamboo.com')
    expect(one(200, body({ status: 'active', type: 'buynow', price: 0 }))).toMatchObject({ outcome: 'unread' })
    expect(one(200, body({ status: 'active', type: 'buynow' }))).toMatchObject({ outcome: 'unread' })
    expect(one(200, body({ status: 'pending', type: 'buynow', price: 100 }))).toMatchObject({ outcome: 'unread' })
    expect(one(403, 'Forbidden')).toMatchObject({ outcome: 'unread' })
    expect(one(200, '{"type":"error"}')).toMatchObject({ outcome: 'unread' })
  })

  it('listed without «buy now»: no fixed price', () => {
    const body = JSON.stringify({ type: 'ok', data: [{ domain: 'chamboo.com', status: 'active', type: 'offer' }] })
    expect(parseNamecheap(['chamboo.com'], 200, body).get('chamboo.com')).toMatchObject({ outcome: 'no_fixed_price' })
  })
})

describe('requests', () => {
  it('every marketplace is asked under the server’s own name', async () => {
    const market = createMarketplaces()
    market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })

    const afternic = await readAfternic('chamboo.com', market.fetch)
    const sedo = await readSedo('chamboo.com', market.fetch)
    const namecheap = await readNamecheap(['chamboo.com', 'google.com'], market.fetch)

    expect(afternic.reading).toMatchObject({ outcome: 'listed', amount: 2695 })
    expect(sedo.reading).toMatchObject({ outcome: 'listed', amount: 2695 })
    expect(namecheap.readings.get('chamboo.com')).toMatchObject({ outcome: 'listed', amount: 2685 })
    expect(namecheap.readings.get('google.com')).toMatchObject({ outcome: 'absent' })
    expect(market.calls).toHaveLength(3)
    for (const call of market.calls) expect(call.userAgent).toBe(PRICE_CHECK_USER_AGENT)
    expect(PRICE_CHECK_USER_AGENT).not.toMatch(/mozilla|chrome|safari/i)
  })

  it('a 403 is a refusal: unread, and the caller is told to stop', async () => {
    const market = createMarketplaces()
    market.listings.set('chamboo.com', { afternic: 2695, sedo: 2695, namecheap: 2685 })
    market.refusing.add('afternic').add('sedo').add('namecheap')

    expect(await readAfternic('chamboo.com', market.fetch)).toMatchObject({ refused: true, reading: { outcome: 'unread' } })
    expect(await readSedo('chamboo.com', market.fetch)).toMatchObject({ refused: true, reading: { outcome: 'unread' } })
    const namecheap = await readNamecheap(['chamboo.com'], market.fetch)
    expect(namecheap.refused).toBe(true)
    expect(namecheap.readings.get('chamboo.com')).toMatchObject({ outcome: 'unread' })
  })

  it('a network error is unread, not a refusal and not «no listing»', async () => {
    const market = createMarketplaces()
    market.unreachable.add('afternic').add('sedo').add('namecheap')

    expect(await readAfternic('chamboo.com', market.fetch)).toMatchObject({ refused: false, reading: { outcome: 'unread' } })
    expect(await readSedo('chamboo.com', market.fetch)).toMatchObject({ refused: false, reading: { outcome: 'unread' } })
    expect((await readNamecheap(['chamboo.com'], market.fetch)).readings.get('chamboo.com')).toMatchObject({
      outcome: 'unread',
    })
  })
})

describe('normalizeDomain', () => {
  it('strips the scheme, the path and the case; refuses what is not a domain', () => {
    expect(normalizeDomain(' https://Chamboo.com/ ')).toBe('chamboo.com')
    expect(normalizeDomain('chamboo.com')).toBe('chamboo.com')
    expect(normalizeDomain('chamboo')).toBeNull()
    expect(normalizeDomain('cham boo.com')).toBeNull()
    expect(normalizeDomain('chamboo.com?x=1,other.com')).toBeNull()
    expect(normalizeDomain('')).toBeNull()
    expect(normalizeDomain(null)).toBeNull()
  })
})
