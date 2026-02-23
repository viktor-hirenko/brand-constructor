import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { requireAdmin } from '../middleware/auth';
import { USER_ROLES } from '@brand-constructor/shared';
import { generateId } from '../utils/id';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const roleEnum = z.enum([
  USER_ROLES.ADMIN,
  USER_ROLES.HEAD_DHC,
  USER_ROLES.PRODUCT_OWNER,
  USER_ROLES.CPO_CEO,
  USER_ROLES.STRATEGY_IDENTITY,
  USER_ROLES.UI_DESIGNER,
  USER_ROLES.PR_MARKETING,
  USER_ROLES.PRODUCT_DESIGNER,
]);

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(300),
  role: roleEnum,
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(300),
  role: roleEnum,
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

app.post('/', requireAdmin, async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(parsed.data.email).first();
  if (existing) {
    return c.json({ success: false, error: 'User with this email already exists' }, 409);
  }

  const id = generateId('usr');
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)'
  ).bind(id, parsed.data.email, parsed.data.name, parsed.data.role).run();

  const user = await c.env.DB.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').bind(id).first();
  return c.json({ success: true, data: user }, 201);
});

app.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');

  if (id === currentUser.id) {
    return c.json({ success: false, error: 'Cannot delete yourself' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { deleted: true } });
});

app.put('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const duplicate = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(parsed.data.email, id).first();
  if (duplicate) {
    return c.json({ success: false, error: 'Another user with this email already exists' }, 409);
  }

  await c.env.DB.prepare(
    "UPDATE users SET name = ?, email = ?, role = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(parsed.data.name, parsed.data.email, parsed.data.role, id).run();

  const updated = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).bind(id).first();

  return c.json({ success: true, data: updated });
});

export default app;
