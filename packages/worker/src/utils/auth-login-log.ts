/** Structured auth events for Cloudflare Workers Logs / `wrangler tail`. */

export type AuthLoginOutcome =
  | 'rate_limited'
  | 'invalid_body'
  | 'missing_credential'
  | 'invalid_google_credential'
  | 'email_not_verified'
  | 'invalid_audience'
  | 'expired_credential'
  | 'domain_not_allowed'
  | 'not_whitelisted'
  | 'success'

export interface AuthLoginLogInput {
  outcome: AuthLoginOutcome
  ip: string
  email?: string
  emailDomain?: string
  httpStatus: number
  allowedEmailDomains?: string
  googleSub?: string
}

function emailDomain(email: string | undefined): string | undefined {
  if (!email) return undefined
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return undefined
  return email.slice(at + 1).toLowerCase()
}

export function logAuthLoginAttempt(input: AuthLoginLogInput): void {
  const payload = {
    event: 'auth_login',
    outcome: input.outcome,
    httpStatus: input.httpStatus,
    ip: input.ip,
    email: input.email ?? null,
    emailDomain: input.emailDomain ?? emailDomain(input.email) ?? null,
    allowedEmailDomains: input.allowedEmailDomains ?? null,
    googleSub: input.googleSub ?? null,
    at: new Date().toISOString(),
  }

  if (input.outcome === 'success') {
    console.log(JSON.stringify(payload))
    return
  }

  console.warn(JSON.stringify(payload))
}
