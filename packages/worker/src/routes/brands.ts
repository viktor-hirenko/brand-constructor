import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateId } from '../utils/id';
import type {
  Brand,
  BrandStatus,
  CreateBrandPayload,
  UpdateBrandPayload,
  UpdateBrandStatusPayload,
} from '@brand-constructor/shared/types';

interface BrandRow {
  id: string;
  internal_name: string | null;
  status: string;
  created_by: string;
  geo: string | null;
  launch_date: string | null;
  mode: string | null;
  concept_id: string | null;
  concept_comment: string | null;
  external_naming_ids: string | null;
  external_naming_comment: string | null;
  internal_naming_id: string | null;
  internal_naming_comment: string | null;
  pr_package_id: string | null;
  pr_package_comment: string | null;
  legal_landing: number;
  partner_landing: number;
  deliverables_comment: string | null;
  component_selections: string | null;
  components_comment: string | null;
  delegate_to_designers: number;
  new_concept_brief: string | null;
  ceo_comments: string | null;
  ceo_selections: string | null;
  step_data: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    internalName: row.internal_name,
    status: row.status as BrandStatus,
    createdBy: row.created_by,
    geo: row.geo,
    launchDate: row.launch_date,
    mode: row.mode as 'light' | 'dark' | null,
    conceptId: row.concept_id,
    conceptComment: row.concept_comment,
    externalNamingIds: row.external_naming_ids ? JSON.parse(row.external_naming_ids) : [],
    externalNamingComment: row.external_naming_comment,
    internalNamingId: row.internal_naming_id,
    internalNamingComment: row.internal_naming_comment,
    prPackageId: row.pr_package_id,
    prPackageComment: row.pr_package_comment,
    legalLanding: Boolean(row.legal_landing),
    partnerLanding: Boolean(row.partner_landing),
    deliverablesComment: row.deliverables_comment,
    componentSelections: row.component_selections ? JSON.parse(row.component_selections) : {},
    componentsComment: row.components_comment,
    delegateToDesigners: Boolean(row.delegate_to_designers),
    newConceptBrief: row.new_concept_brief ? JSON.parse(row.new_concept_brief) : null,
    ceoComments: row.ceo_comments ? JSON.parse(row.ceo_comments) : null,
    ceoSelections: row.ceo_selections ? JSON.parse(row.ceo_selections) : null,
    stepData: row.step_data ? JSON.parse(row.step_data) : null,
    currentStep: row.current_step,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const brands = new Hono<{ Bindings: Env; Variables: Variables }>();

brands.get('/', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const perPage = parseInt(c.req.query('per_page') || '20');
  const status = c.req.query('status');
  const offset = (page - 1) * perPage;

  let query = 'SELECT * FROM brands WHERE created_by = ?';
  const params: (string | number)[] = [user.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(perPage, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all<BrandRow>();

  let countQuery = 'SELECT COUNT(*) as count FROM brands WHERE created_by = ?';
  const countParams: string[] = [user.id];
  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }
  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

  return c.json({
    success: true,
    data: result.results.map(rowToBrand),
    total: countResult?.count || 0,
    page,
    perPage,
  });
});

brands.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const row = await c.env.DB.prepare(
    'SELECT * FROM brands WHERE id = ? AND created_by = ?'
  ).bind(id, user.id).first<BrandRow>();

  if (!row) {
    return c.json({ success: false, error: 'Brand not found' }, 404);
  }

  return c.json({ success: true, data: rowToBrand(row) });
});

brands.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<CreateBrandPayload>();
  const id = generateId('brand');
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO brands (id, internal_name, status, created_by, current_step, created_at, updated_at)
    VALUES (?, ?, 'draft', ?, 1, ?, ?)
  `).bind(id, body.internalName || null, user.id, now, now).run();

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>();

  return c.json({ success: true, data: rowToBrand(row!) }, 201);
});

brands.put('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json<UpdateBrandPayload>();

  const existing = await c.env.DB.prepare(
    'SELECT * FROM brands WHERE id = ? AND created_by = ?'
  ).bind(id, user.id).first<BrandRow>();

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.internalName !== undefined) {
    updates.push('internal_name = ?');
    values.push(body.internalName);
  }
  if (body.geo !== undefined) {
    updates.push('geo = ?');
    values.push(body.geo);
  }
  if (body.launchDate !== undefined) {
    updates.push('launch_date = ?');
    values.push(body.launchDate);
  }
  if (body.mode !== undefined) {
    updates.push('mode = ?');
    values.push(body.mode);
  }
  if (body.conceptId !== undefined) {
    updates.push('concept_id = ?');
    values.push(body.conceptId);
  }
  if (body.conceptComment !== undefined) {
    updates.push('concept_comment = ?');
    values.push(body.conceptComment);
  }
  if (body.externalNamingIds !== undefined) {
    updates.push('external_naming_ids = ?');
    values.push(JSON.stringify(body.externalNamingIds));
  }
  if (body.externalNamingComment !== undefined) {
    updates.push('external_naming_comment = ?');
    values.push(body.externalNamingComment);
  }
  if (body.internalNamingId !== undefined) {
    updates.push('internal_naming_id = ?');
    values.push(body.internalNamingId);
  }
  if (body.internalNamingComment !== undefined) {
    updates.push('internal_naming_comment = ?');
    values.push(body.internalNamingComment);
  }
  if (body.prPackageId !== undefined) {
    updates.push('pr_package_id = ?');
    values.push(body.prPackageId);
  }
  if (body.prPackageComment !== undefined) {
    updates.push('pr_package_comment = ?');
    values.push(body.prPackageComment);
  }
  if (body.legalLanding !== undefined) {
    updates.push('legal_landing = ?');
    values.push(body.legalLanding ? 1 : 0);
  }
  if (body.partnerLanding !== undefined) {
    updates.push('partner_landing = ?');
    values.push(body.partnerLanding ? 1 : 0);
  }
  if (body.deliverablesComment !== undefined) {
    updates.push('deliverables_comment = ?');
    values.push(body.deliverablesComment);
  }
  if (body.componentSelections !== undefined) {
    updates.push('component_selections = ?');
    values.push(JSON.stringify(body.componentSelections));
  }
  if (body.componentsComment !== undefined) {
    updates.push('components_comment = ?');
    values.push(body.componentsComment);
  }
  if (body.delegateToDesigners !== undefined) {
    updates.push('delegate_to_designers = ?');
    values.push(body.delegateToDesigners ? 1 : 0);
  }
  if (body.newConceptBrief !== undefined) {
    updates.push('new_concept_brief = ?');
    values.push(JSON.stringify(body.newConceptBrief));
  }
  if (body.stepData !== undefined) {
    updates.push('step_data = ?');
    values.push(JSON.stringify(body.stepData));
  }
  if (body.currentStep !== undefined) {
    updates.push('current_step = ?');
    values.push(body.currentStep);
  }

  if (updates.length === 0) {
    return c.json({ success: true, data: rowToBrand(existing) });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await c.env.DB.prepare(
    `UPDATE brands SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>();

  return c.json({ success: true, data: rowToBrand(row!) });
});

brands.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateBrandStatusPayload>();

  const existing = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>();

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404);
  }

  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const values: (string | number | null)[] = [body.status, new Date().toISOString()];

  if (body.ceoComments !== undefined) {
    updates.push('ceo_comments = ?');
    values.push(JSON.stringify(body.ceoComments));
  }
  if (body.ceoSelections !== undefined) {
    updates.push('ceo_selections = ?');
    values.push(JSON.stringify(body.ceoSelections));
  }

  values.push(id);

  await c.env.DB.prepare(
    `UPDATE brands SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const row = await c.env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(id).first<BrandRow>();

  return c.json({ success: true, data: rowToBrand(row!) });
});

brands.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM brands WHERE id = ? AND created_by = ?'
  ).bind(id, user.id).first<BrandRow>();

  if (!existing) {
    return c.json({ success: false, error: 'Brand not found' }, 404);
  }

  if (existing.status !== 'draft') {
    return c.json({ success: false, error: 'Only draft brands can be deleted' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id).run();

  return c.json({ success: true, data: null });
});

export default brands;
