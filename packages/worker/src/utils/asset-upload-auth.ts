import { LIBRARY_WRITE_PERMISSIONS } from '@brand-constructor/shared'
import type { AssetEntityType } from '@brand-constructor/shared'

export function libraryKeyForAssetUpload(entityType: AssetEntityType): string | null {
  if (entityType === 'concept_visual') return 'concepts'
  if (entityType === 'component_thumbnail') return 'component_variants'
  if (/^concept_gallery_\d{1,2}$/.test(entityType)) return 'concepts'
  return null
}

export function canUserUploadAsset(entityType: AssetEntityType, role: string): boolean {
  const libraryKey = libraryKeyForAssetUpload(entityType)
  if (!libraryKey) return false
  const allowedRoles = LIBRARY_WRITE_PERMISSIONS[libraryKey]
  return allowedRoles?.includes(role) ?? false
}

/**
 * The concept an asset belongs to, or null when it belongs to something else.
 *
 * A concept picked by an approved brand is frozen: `PUT /concepts/:id` has
 * refused it since the first version, but its images could still be uploaded
 * over or deleted through `/assets`. The owner, 29.09: once a concept is used,
 * nothing on it changes — title, text, theme or images. `routes/assets.ts`
 * asks this on both upload and delete.
 */
export function conceptIdForAsset(entityType: string, entityId: string): string | null {
  return entityType === 'concept_visual' || /^concept_gallery_\d{1,2}$/.test(entityType)
    ? entityId
    : null
}

/** The same test `PUT /concepts/:id` applies, plus the brand link itself. */
export function isConceptLocked(
  concept: { status?: unknown; used_in_brand_id?: unknown } | null | undefined,
): boolean {
  return Boolean(concept && (concept.status === 'used' || concept.used_in_brand_id))
}

export const CONCEPT_LOCKED_ERROR = 'Cannot modify a concept that is used in a brand'
