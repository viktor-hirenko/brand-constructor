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
