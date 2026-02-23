import { ASSET_VALIDATION_RULES, ASSET_FILE_TYPES } from '@brand-constructor/shared';
import type { AssetEntityType, AssetFileType } from '@brand-constructor/shared';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ImageMeta {
  width: number;
  height: number;
  aspectRatio: number;
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

export function detectFileType(buffer: ArrayBuffer): AssetFileType | null {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 4 && PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return ASSET_FILE_TYPES.PNG;
  }

  const text = new TextDecoder().decode(bytes.slice(0, 256));
  if (text.includes('<svg') || text.includes('<?xml')) {
    return ASSET_FILE_TYPES.SVG;
  }

  return null;
}

export function extractPngDimensions(buffer: ArrayBuffer): ImageMeta | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 24) return null;

  const width = view.getUint32(16);
  const height = view.getUint32(20);

  if (width === 0 || height === 0) return null;

  return { width, height, aspectRatio: width / height };
}

export function validateAsset(
  entityType: AssetEntityType,
  fileType: AssetFileType,
  fileSize: number,
  meta: ImageMeta | null
): ValidationResult {
  const errors: string[] = [];

  const rule = ASSET_VALIDATION_RULES.find((r) => r.entity_type === entityType);
  if (!rule) {
    return { valid: false, errors: [`Unknown entity type: ${entityType}`] };
  }

  if (!rule.allowed_types.includes(fileType)) {
    errors.push(`File type "${fileType}" not allowed. Accepted: ${rule.allowed_types.join(', ')}`);
  }

  if (fileSize > rule.max_file_size) {
    const maxMb = (rule.max_file_size / (1024 * 1024)).toFixed(0);
    const actualMb = (fileSize / (1024 * 1024)).toFixed(2);
    errors.push(`File too large: ${actualMb}MB (max ${maxMb}MB)`);
  }

  if (fileType === 'svg') {
    return { valid: errors.length === 0, errors };
  }

  if (!meta) {
    errors.push('Could not read image dimensions');
    return { valid: false, errors };
  }

  if (meta.width < rule.min_width || meta.height < rule.min_height) {
    errors.push(
      `Image too small: ${meta.width}x${meta.height} (minimum ${rule.min_width}x${rule.min_height})`
    );
  }

  const expectedRatio = rule.aspect_ratio;
  const actualRatio = meta.aspectRatio;
  if (Math.abs(actualRatio - expectedRatio) > rule.aspect_ratio_tolerance) {
    const expected = expectedRatio > 1 ? `${Math.round(expectedRatio * 9)}:9` : `9:${Math.round(9 / expectedRatio)}`;
    errors.push(
      `Wrong aspect ratio: ${actualRatio.toFixed(2)} (expected ~${expectedRatio.toFixed(2)}, ${expected})`
    );
  }

  return { valid: errors.length === 0, errors };
}
