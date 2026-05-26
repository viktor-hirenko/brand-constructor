export interface Env {
  DB: D1Database
  ASSETS_BUCKET: R2Bucket
  ENVIRONMENT: string
  CORS_ORIGINS: string
  JWT_SECRET: string
  CONSTRUCTOR_URL: string
  GOOGLE_CLIENT_ID: string
  /**
   * Comma-separated list of email domains permitted at Google login
   * (e.g. `"upstars.com"`). Empty or unset disables the gate — see
   * `utils/email-access.ts`.
   */
  ALLOWED_EMAIL_DOMAINS?: string
  SLACK_BOT_TOKEN: string
  SLACK_CHANNEL_STRATEGY: string
  SLACK_CHANNEL_PR: string
  SLACK_CHANNEL_DESIGN: string
  SLACK_CHANNEL_APPROVALS: string
  PANANAMES_SIGNATURE: string
  // Cloudflare Rate Limiting binding. Defined only under [env.production]
  // in wrangler.toml, so it is optional at the type level — `wrangler dev`
  // without `--env production` boots without it. Consumers must tolerate
  // `undefined` (e.g. routes/auth.ts skips the gate locally).
  AUTH_RATE_LIMITER?: RateLimit
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export type Variables = {
  user: AuthUser
  // How the current request was authenticated. Cookie is the only path on
  // every environment (local development logs in through the same Google
  // OAuth flow as production); kept as a discriminated value so middleware
  // and CSRF can assert the auth context explicitly.
  authMethod: 'cookie'
  // JWT `iat` of the auth cookie used for this request — re-used by
  // csrfMiddleware to deterministically derive the expected X-CSRF-Token
  // without any per-session state. Undefined for requests that have not yet
  // passed authMiddleware.
  jwtIat?: number
}
