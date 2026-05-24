import { describe, expect, it } from 'vitest'
import { USER_ROLES } from '@brand-constructor/shared'
import { canUserUploadAsset, libraryKeyForAssetUpload } from '@/utils/asset-upload-auth'

describe('libraryKeyForAssetUpload', () => {
  it('maps concept assets to concepts library', () => {
    expect(libraryKeyForAssetUpload('concept_visual')).toBe('concepts')
    expect(libraryKeyForAssetUpload('concept_gallery_1')).toBe('concepts')
  })

  it('maps component thumbnails to component_variants library', () => {
    expect(libraryKeyForAssetUpload('component_thumbnail')).toBe('component_variants')
  })

  it('returns null for unsupported entity types', () => {
    expect(libraryKeyForAssetUpload('unknown_type' as 'concept_visual')).toBe(null)
  })
})

describe('canUserUploadAsset', () => {
  it('allows strategy identity to upload concept visuals', () => {
    expect(canUserUploadAsset('concept_visual', USER_ROLES.STRATEGY_IDENTITY)).toBe(true)
  })

  it('allows UI designer to upload component thumbnails', () => {
    expect(canUserUploadAsset('component_thumbnail', USER_ROLES.UI_DESIGNER)).toBe(true)
  })

  it('denies product owner uploads for library assets', () => {
    expect(canUserUploadAsset('concept_visual', USER_ROLES.PRODUCT_OWNER)).toBe(false)
    expect(canUserUploadAsset('component_thumbnail', USER_ROLES.PRODUCT_OWNER)).toBe(false)
  })

  it('denies uploads for unsupported entity types', () => {
    expect(canUserUploadAsset('unknown_type' as 'concept_visual', USER_ROLES.ADMIN)).toBe(false)
  })
})
