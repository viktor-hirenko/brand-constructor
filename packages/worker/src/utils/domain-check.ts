import type { Env } from '../types'

interface PananamesPrices {
  currency: string
  register: number
  renew: number
  transfer: number
  redeem: number
}

interface PananamesDomainCheckResponse {
  domain: string
  domain_idn: string
  available: boolean
  premium: boolean
  prices: PananamesPrices | null
  promo_prices: PananamesPrices | null
  claim: boolean
  add_req: boolean
}

interface DomainCheckResult {
  available: boolean
  price: number | null
  currency: string | null
  source: 'pananames'
  checkedAt: string
}

const PANANAMES_API_BASE = 'https://api.pananames.com/merchant/v2'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export function isPananamesConfigured(env: Env): boolean {
  return Boolean(env.PANANAMES_SIGNATURE)
}

export async function checkDomainAvailability(
  domain: string,
  env: Env
): Promise<DomainCheckResult | null> {
  if (!isPananamesConfigured(env)) {
    console.warn('Pananames API signature not configured, skipping domain check')
    return null
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim()
  if (!cleanDomain || !cleanDomain.includes('.')) {
    return null
  }

  try {
    const url = `${PANANAMES_API_BASE}/domains/${encodeURIComponent(cleanDomain)}/check`
    const response = await fetch(url, {
      headers: {
        SIGNATURE: env.PANANAMES_SIGNATURE,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(
        `Pananames API error for domain "${cleanDomain}": HTTP ${response.status} — ${text}`
      )
      return null
    }

    const json: { data: PananamesDomainCheckResponse } = await response.json()
    const data = json.data
    console.log(
      `Pananames check for "${cleanDomain}": available=${data.available}, price=${data.prices?.register}, currency=${data.prices?.currency}`
    )

    return {
      available: data.available,
      price:
        data.prices && typeof data.prices.register === 'number' && data.prices.register > 0
          ? Math.round(data.prices.register)
          : null,
      currency: data.prices?.currency || 'USD',
      source: 'pananames',
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Domain check exception for "${cleanDomain}":`, error)
    return null
  }
}

export function shouldRecheck(checkedAt: string | null): boolean {
  if (!checkedAt) return true
  const elapsed = Date.now() - new Date(checkedAt).getTime()
  return elapsed > CACHE_TTL_MS
}

export async function updateNamingDomainStatus(
  db: D1Database,
  namingId: string,
  result: DomainCheckResult
): Promise<void> {
  const status = result.available ? 'available' : 'sold'

  await db
    .prepare(
      `UPDATE external_namings
       SET availability_status = ?,
           price = COALESCE(?, price),
           domain_checked_at = ?,
           domain_check_source = ?,
           updated_at = datetime('now')
       WHERE id = ? AND domain_check_source != 'admin_override'`
    )
    .bind(status, result.price, result.checkedAt, result.source, namingId)
    .run()
}

export async function batchCheckDomains(env: Env): Promise<{ checked: number; updated: number }> {
  const namings = await env.DB.prepare(
    `SELECT id, domain, domain_checked_at, domain_check_source
     FROM external_namings
     WHERE domain IS NOT NULL
       AND domain != ''
       AND status IN ('active', 'used')
       AND domain_check_source != 'admin_override'`
  ).all<{
    id: string
    domain: string
    domain_checked_at: string | null
    domain_check_source: string | null
  }>()

  let checked = 0
  let updated = 0

  for (const naming of namings.results) {
    const result = await checkDomainAvailability(naming.domain, env)
    if (result) {
      checked++
      await updateNamingDomainStatus(env.DB, naming.id, result)
      updated++
    }
    // Rate limit: ~1 request per 500ms to avoid API throttling
    await new Promise(r => setTimeout(r, 500))
  }

  return { checked, updated }
}
