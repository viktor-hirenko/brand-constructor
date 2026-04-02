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
}
