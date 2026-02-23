import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { requireAdmin } from '../middleware/auth';
import { USER_ROLES } from '@brand-constructor/shared';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const updateRoleSchema = z.object({
  role: z.enum([
    USER_ROLES.ADMIN,
    USER_ROLES.HEAD_DHC,
    USER_ROLES.PRODUCT_OWNER,
    USER_ROLES.CPO_CEO,
    USER_ROLES.STRATEGY_IDENTITY,
    USER_ROLES.UI_DESIGNER,
    USER_ROLES.PR_MARKETING,
    USER_ROLES.PRODUCT_DESIGNER,
  ]),
});

app.get('/me', async (c) => {
  const user = c.get('user');
  return c.json({ success: true, data: user });
});

app.get('/', requireAdmin, async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
  ).all();

  return c.json({ success: true, data: users.results });
});

app.put('/:id/role', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  await c.env.DB.prepare(
    "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(parsed.data.role, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).bind(id).first();

  return c.json({ success: true, data: updated });
});

export default app;
