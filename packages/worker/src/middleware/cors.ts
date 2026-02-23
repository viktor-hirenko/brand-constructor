import { cors } from 'hono/cors';
import type { Env } from '../types';

export function createCorsMiddleware() {
  return cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGIN || 'http://localhost:5173';
      if (origin === allowed || allowed === '*') {
        return origin;
      }
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CF-Access-JWT-Assertion'],
    maxAge: 86400,
  });
}
