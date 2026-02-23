import type { AssetEntityType, AssetFileType } from '@brand-constructor/shared';

export function buildR2Key(
  entityType: AssetEntityType,
  entityId: string,
  fileName: string
): string {
  return `${entityType}/${entityId}/${fileName}`;
}

export function getContentType(fileType: AssetFileType): string {
  const map: Record<string, string> = {
    png: 'image/png',
    svg: 'image/svg+xml',
  };
  return map[fileType] || 'application/octet-stream';
}
