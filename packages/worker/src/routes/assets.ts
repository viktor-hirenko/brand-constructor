import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateId } from '../utils/id';
import { detectFileType, extractPngDimensions, validateAsset } from '../utils/asset-validation';
import { buildR2Key, getContentType } from '../utils/r2';
import type { AssetEntityType } from '@brand-constructor/shared';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const entityType = formData.get('entity_type') as AssetEntityType | null;
  const entityId = formData.get('entity_id') as string | null;
  const componentTypeId = formData.get('component_type_id') as string | null;
  const aspectRatioParam = formData.get('aspect_ratio') as string | null;

  if (!file || !entityType || !entityId) {
    return c.json({ success: false, error: 'Missing required fields: file, entity_type, entity_id' }, 400);
  }

  if (entityType === 'component_thumbnail' && !componentTypeId) {
    return c.json({ success: false, error: 'component_type_id is required for component_thumbnail uploads' }, 400);
  }

  const buffer = await file.arrayBuffer();
  const fileType = detectFileType(buffer);

  if (!fileType) {
    return c.json({ success: false, error: 'Unsupported file type. Only PNG and SVG are allowed.' }, 400);
  }

  let meta = null;
  if (fileType === 'png') {
    meta = extractPngDimensions(buffer);
  }

  // Parse optional aspect_ratio override from user input
  const aspectRatioOverride = aspectRatioParam ? parseFloat(aspectRatioParam) : undefined;

  const validation = validateAsset(entityType, fileType, buffer.byteLength, meta, componentTypeId || undefined, aspectRatioOverride);
  if (!validation.valid) {
    return c.json({
      success: false,
      error: `Asset validation failed: ${validation.errors.join('; ')}`,
      details: { validation: validation.errors },
    }, 400);
  }

  const id = generateId('ast');
  const safeFileName = `${id}.${fileType}`;
  const r2Key = buildR2Key(entityType, entityId, safeFileName);

  await c.env.ASSETS_BUCKET.put(r2Key, buffer, {
    httpMetadata: { contentType: getContentType(fileType) },
    customMetadata: { entityType, entityId, originalName: file.name },
  });

  const fileUrl = `/api/assets/${r2Key}`;

  await c.env.DB.prepare(
    `INSERT INTO assets (id, entity_type, entity_id, file_url, file_name, file_type, aspect_ratio, width, height, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    entityType,
    entityId,
    fileUrl,
    file.name,
    fileType,
    meta?.aspectRatio || 0,
    meta?.width || 0,
    meta?.height || 0,
    buffer.byteLength
  ).run();

  if (entityType === 'concept_visual') {
    await c.env.DB.prepare("UPDATE concepts SET visual_url = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(fileUrl, entityId).run();
  } else if (entityType === 'concept_logo') {
    await c.env.DB.prepare("UPDATE concepts SET logo_url = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(fileUrl, entityId).run();
  } else if (entityType === 'component_thumbnail') {
    await c.env.DB.prepare("UPDATE component_variants SET thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(fileUrl, entityId).run();
  }

  const asset = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
  return c.json({ success: true, data: asset }, 201);
});

app.get('/:entityType/:entityId/:fileName', async (c) => {
  const key = `${c.req.param('entityType')}/${c.req.param('entityId')}/${c.req.param('fileName')}`;

  const object = await c.env.ASSETS_BUCKET.get(key);
  if (!object) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);

  return new Response(object.body, { headers });
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const asset = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
  if (!asset) {
    return c.json({ success: false, error: 'Asset not found' }, 404);
  }

  const r2Key = (asset.file_url as string).replace('/api/assets/', '');
  await c.env.ASSETS_BUCKET.delete(r2Key);
  await c.env.DB.prepare('DELETE FROM assets WHERE id = ?').bind(id).run();

  return c.json({ success: true, data: { deleted: true } });
});

export default app;
