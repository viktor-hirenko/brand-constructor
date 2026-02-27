import {
  ASSET_VALIDATION_RULES,
  ASSET_FILE_TYPES,
  COMPONENT_TYPE_ASPECT_RATIOS,
} from '@brand-constructor/shared';
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

function formatRatio(ratio: number): string {
  // Always show as width:height format for consistency
  if (ratio >= 1) {
    // Landscape or square: show as X:1 or simplified
    if (ratio >= 4) return `${ratio.toFixed(1)}:1`;
    if (Number.isInteger(ratio * 10)) return `${(ratio * 10).toFixed(0)}:10`;
    return `${ratio.toFixed(2)}:1`;
  }
  // Portrait: show as 1:Y format but also show decimal
  const inverted = 1 / ratio;
  return `${ratio.toFixed(2)}:1 (portrait ~1:${inverted.toFixed(1)})`;
}

export function validateAsset(
  entityType: AssetEntityType,
  fileType: AssetFileType,
  fileSize: number,
  meta: ImageMeta | null,
  componentTypeId?: string
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

  let expectedRatio = rule.aspect_ratio;
  let minWidth = rule.min_width;
  let minHeight = rule.min_height;
  let tolerance = rule.aspect_ratio_tolerance;

  if (entityType === 'component_thumbnail' && componentTypeId) {
    const typeConfig = COMPONENT_TYPE_ASPECT_RATIOS[componentTypeId];
    if (typeConfig) {
      expectedRatio = typeConfig.aspect_ratio;
      minWidth = typeConfig.min_width;
      minHeight = typeConfig.min_height;
    }
  }

  if (meta.width < minWidth || meta.height < minHeight) {
    errors.push(
      `Image too small: ${meta.width}x${meta.height} (minimum ${minWidth}x${minHeight})`
    );
  }

  if (expectedRatio > 0) {
    const actualRatio = meta.aspectRatio;
    if (Math.abs(actualRatio - expectedRatio) > tolerance) {
      errors.push(
        `Wrong aspect ratio: ${formatRatio(actualRatio)} (expected ~${formatRatio(expectedRatio)})`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
