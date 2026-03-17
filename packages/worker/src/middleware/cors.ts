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
    allowHeaders: ['Content-Type', 'Authorization', 'X-CF-Access-JWT-Assertion'],
    maxAge: 86400,
  });
}
