import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { requireLibraryAccess } from '../middleware/auth';
import { generateId } from '../utils/id';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  mode: z.enum(['light', 'dark']).nullable().optional(),
  naming_ids: z.array(z.string()).max(10).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  mode: z.enum(['light', 'dark']).nullable().optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  visual_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  preview_url: z.string().nullable().optional(),
});

app.get('/', async (c) => {
  const status = c.req.query('status') || 'active';
  const mode = c.req.query('mode');
  const availableForBrand = c.req.query('available_for_brand');
  const page = parseInt(c.req.query('page') || '1');
  const perPage = Math.min(parseInt(c.req.query('per_page') || '20'), 100);
  const offset = (page - 1) * perPage;

  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (status && status !== 'all') {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }

  if (mode && (mode === 'light' || mode === 'dark')) {
    whereClause += ' AND c.mode = ?';
    params.push(mode);
  }

  if (availableForBrand) {
    whereClause += ' AND (c.used_in_brand_id IS NULL OR c.used_in_brand_id = ?)';
    params.push(availableForBrand);
  }

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM concepts c WHERE ${whereClause}`
  ).bind(...params).first<{ total: number }>();

  const concepts = await c.env.DB.prepare(
    `SELECT c.*, u.name as author_name
     FROM concepts c
     LEFT JOIN users u ON c.created_by = u.id
     WHERE ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();

  return c.json({
    success: true,
    data: concepts.results,
    total: countResult?.total || 0,
    page,
    per_page: perPage,
  });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const concept = await c.env.DB.prepare(
    `SELECT c.*, u.name as author_name
     FROM concepts c
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id = ?`
  ).bind(id).first();

  if (!concept) {
    return c.json({ success: false, error: 'Concept not found' }, 404);
  }

  const namings = await c.env.DB.prepare(
    'SELECT * FROM external_namings WHERE concept_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  const assets = await c.env.DB.prepare(
    "SELECT * FROM assets WHERE entity_id = ? AND entity_type LIKE 'concept_%'"
  ).bind(id).all();

  return c.json({
    success: true,
    data: { ...concept, namings: namings.results, assets: assets.results },
  });
});

app.post('/', requireLibraryAccess('concepts'), async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const user = c.get('user');
  const id = generateId('con');

  await c.env.DB.prepare(
    'INSERT INTO concepts (id, name, description, mode, created_by) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, parsed.data.name, parsed.data.description, parsed.data.mode || null, user.id).run();

  const namingIds = parsed.data.naming_ids?.filter(Boolean) ?? [];
  if (namingIds.length > 0) {
    const placeholders = namingIds.map(() => '?').join(', ');
    await c.env.DB.prepare(
      `UPDATE external_namings SET concept_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND concept_id IS NULL`
    ).bind(id, ...namingIds).run();
  }

  await c.env.DB.prepare(
    "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, 'create', 'concept', ?, ?)"
  ).bind(generateId('log'), user.id, id, JSON.stringify({ name: parsed.data.name, naming_ids: namingIds })).run();

  const concept = await c.env.DB.prepare('SELECT * FROM concepts WHERE id = ?').bind(id).first();

  return c.json({ success: true, data: concept }, 201);
});

app.put('/:id', requireLibraryAccess('concepts'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT * FROM concepts WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'Concept not found' }, 404);
  }

  if (existing.status === 'used') {
    return c.json({ success: false, error: 'Cannot modify a concept that is used in a brand' }, 409);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value as string | null);
    }
  }

  if (updates.length === 0) {
    return c.json({ success: true, data: existing });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE concepts SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const user = c.get('user');
  await c.env.DB.prepare(
    "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, 'update', 'concept', ?, ?)"
  ).bind(generateId('log'), user.id, id, JSON.stringify(parsed.data)).run();

  const updated = await c.env.DB.prepare('SELECT * FROM concepts WHERE id = ?').bind(id).first();
  return c.json({ success: true, data: updated });
});

app.delete('/:id', requireLibraryAccess('concepts'), async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM concepts WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ success: false, error: 'Concept not found' }, 404);
  }

  if (existing.used_in_brand_id) {
    return c.json({ success: false, error: 'Cannot delete a concept used in a brand. Archive it instead.' }, 409);
  }

  await c.env.DB.prepare('UPDATE external_namings SET concept_id = NULL WHERE concept_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM concepts WHERE id = ?').bind(id).run();

  const user = c.get('user');
  await c.env.DB.prepare(
    "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'delete', 'concept', ?)"
  ).bind(generateId('log'), user.id, id).run();

  return c.json({ success: true, data: { deleted: true } });
});

export default app;
