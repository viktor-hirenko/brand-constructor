/**
 * Corporate email-domain gate for Google login.
 *
 * Toggle via the Worker `ALLOWED_EMAIL_DOMAINS` env var (comma-separated):
 *   • unset or empty → check is OFF (any verified Google account allowed
 *     by the existing per-email D1 whitelist still applies)
 *   • "upstars.com"  → only @upstars.com may log in
 *   • "upstars.com,gmail.com" → multiple domains, useful for local dev
 *
 * Kept entirely in the Worker because this is a server-side authorization
 * concern — never trust the SPA to enforce it.
 */
export function isCorporateEmailAllowed(
  email: string,
  allowedDomains: string | undefined
): boolean {
  const domains = parseDomains(allowedDomains)
  if (domains.length === 0) return true // gate disabled

  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return false

  return domains.includes(email.slice(at + 1).toLowerCase())
}

export function corporateEmailDenialMessage(allowedDomains: string | undefined): string {
  const domains = parseDomains(allowedDomains)
  const list = domains.map(d => `@${d}`).join(', ')
  return `Access denied. Only ${list} accounts are allowed.`
}

function parseDomains(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean)
}
