import type { Env } from '../types'

interface GoDaddyAvailabilityResponse {
  available: boolean
  domain: string
  definitive: boolean
  price: number
  currency: string
}

interface DomainCheckResult {
  available: boolean
  price: number | null
  currency: string | null
  source: 'godaddy'
  checkedAt: string
}

const GODADDY_API_BASE = 'https://api.godaddy.com/v1'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export function isGoDaddyConfigured(env: Env): boolean {
  return Boolean(env.GODADDY_API_KEY && env.GODADDY_API_SECRET)
}

export async function checkDomainAvailability(
  domain: string,
  env: Env
): Promise<DomainCheckResult | null> {
  if (!isGoDaddyConfigured(env)) {
    console.warn('GoDaddy API credentials not configured, skipping domain check')
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
    const url = `${GODADDY_API_BASE}/domains/available?domain=${encodeURIComponent(cleanDomain)}`
    const response = await fetch(url, {
      headers: {
        Authorization: `sso-key ${env.GODADDY_API_KEY}:${env.GODADDY_API_SECRET}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(
        `GoDaddy API error for domain "${cleanDomain}": HTTP ${response.status} — ${text}`
      )
      return null
    }

    const data: GoDaddyAvailabilityResponse = await response.json()
    console.log(
      `GoDaddy check for "${cleanDomain}": available=${data.available}, price=${data.price}, currency=${data.currency}`
    )

    return {
      available: data.available,
      // GoDaddy returns price in microcents (e.g. 7490000 = $7.49)
      price:
        typeof data.price === 'number' && data.price > 0
          ? Math.round(data.price / 1_000_000)
          : null,
      currency: data.currency || 'USD',
      source: 'godaddy',
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
