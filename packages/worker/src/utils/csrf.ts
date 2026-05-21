// Stateless CSRF token derivation.
//
// The token is an HMAC-SHA256 of the constant string `csrf:<sub>:<iat>`,
// signed with JWT_SECRET. Because both inputs (the user id and the JWT
// `iat`) are server-derived from the verified JWT inside the HttpOnly
// cookie, the server can re-compute the expected value for any incoming
// request without storing any per-session state.
//
// Double-submit semantics: the client receives the token on /api/auth/google
// and /api/auth/me responses (in the JSON body, NOT in any cookie), keeps
// it in Pinia (not in localStorage), and sends it back in the X-CSRF-Token
// header on every mutating request. The CSRF middleware re-computes the
// expected token from the cookie's JWT and compares with constant-time
// equality.
//
// An XSS attacker on the legitimate SPA origin can read the in-memory
// token from Pinia and forge requests, but cannot steal it (HttpOnly
// cookie still contains the actual auth credential). A cross-site attacker
// on evil.com cannot read the Pinia store at all, and SameSite=Lax on the
// auth cookie blocks the cookie from being attached to cross-site fetches
// in the first place.

const ENCODER = new TextEncoder()

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function createCsrfToken(
  payload: { sub: string; iat: number },
  secret: string
): Promise<string> {
  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    ENCODER.encode(`csrf:${payload.sub}:${payload.iat}`)
  )
  return base64UrlEncode(sig)
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
