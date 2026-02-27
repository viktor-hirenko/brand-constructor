export interface Env {
  DB: D1Database
  ASSETS_BUCKET: R2Bucket
  ENVIRONMENT: string
  CORS_ORIGIN: string
  JWT_SECRET: string
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
