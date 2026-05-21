export interface Env {
  DB: D1Database
  ASSETS_BUCKET: R2Bucket
  ENVIRONMENT: string
  CORS_ORIGINS: string
  JWT_SECRET: string
  CONSTRUCTOR_URL: string
  SLACK_BOT_TOKEN: string
  SLACK_CHANNEL_STRATEGY: string
  SLACK_CHANNEL_PR: string
  SLACK_CHANNEL_DESIGN: string
  SLACK_CHANNEL_APPROVALS: string
  PANANAMES_SIGNATURE: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export type Variables = {
  user: AuthUser
  // F-05: how the current request was authenticated. `cookie` is the
  // production path; `dev` is the local X-Dev-User-Email shortcut.
  authMethod: 'cookie' | 'dev'
  // F-05: JWT `iat` of the auth cookie used for this request — re-used by
  // csrfMiddleware to deterministically derive the expected X-CSRF-Token
  // without any per-session state. Undefined for `dev` (no JWT) and for
  // requests that did not yet pass authMiddleware.
  jwtIat?: number
}
