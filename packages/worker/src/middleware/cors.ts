import { cors } from 'hono/cors';
import type { Env } from '../types';

export function createCorsMiddleware() {
  return cors({
    origin: (origin, c) => {
      const allowedOrigins = (c.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',');
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // X-CSRF-Token: F-05 — header sent by SPA on mutating requests.
    allowHeaders: ['Content-Type', 'Authorization', 'X-CF-Access-JWT-Assertion', 'X-CSRF-Token'],
    // F-05: required for HttpOnly auth cookie to flow on direct cross-origin
    // calls to the worker (e.g., the workers.dev URL still being hit by curl
    // or by the Pages Functions proxy in `credentials: include` mode).
    credentials: true,
    maxAge: 86400,
  });
}
