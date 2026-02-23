import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types';
import { createCorsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import conceptsRoutes from './routes/concepts';
import namingsRoutes from './routes/namings';
import prPackagesRoutes from './routes/pr-packages';
import componentsRoutes from './routes/components';
import assetsRoutes from './routes/assets';
import usersRoutes from './routes/users';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', logger());
app.use('*', createCorsMiddleware());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

app.get('/api/assets/:entityType/:entityId/:fileName', async (c) => {
  const key = `${c.req.param('entityType')}/${c.req.param('entityId')}/${c.req.param('fileName')}`;
  const object = await c.env.ASSETS_BUCKET.get(key);
  if (!object) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

app.use('/api/*', authMiddleware);

app.route('/api/concepts', conceptsRoutes);
app.route('/api/namings', namingsRoutes);
app.route('/api/pr-packages', prPackagesRoutes);
app.route('/api/components', componentsRoutes);
app.route('/api/assets', assetsRoutes);
app.route('/api/users', usersRoutes);

app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

export default app;
