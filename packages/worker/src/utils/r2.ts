import type { AssetEntityType, AssetFileType } from '@brand-constructor/shared'

export function buildR2Key(
  entityType: AssetEntityType,
  entityId: string,
  fileName: string
): string {
  return `${entityType}/${entityId}/${fileName}`
}

export function getContentType(fileType: AssetFileType): string {
  // SVG is intentionally absent — see packages/shared/src/constants/assets.ts.
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    webp: 'image/webp',
  }
  return map[fileType] || 'application/octet-stream'
}
