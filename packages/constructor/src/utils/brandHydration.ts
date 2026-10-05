import type { Brand, BrandCeoComments, BrandStepData } from '@brand-constructor/shared/types'

export interface ConstructorStoreBrandLoader {
  loadBrand: (
    id: string,
    data: BrandStepData,
    step: number,
    status?: string,
    internalName?: string,
    ceoComments?: BrandCeoComments | null,
    ceoSelections?: Record<string, string | string[]> | null,
    ordersReadyAt?: string | null,
    updatedAt?: string
  ) => void
  restoreWizardDraftCopy: (id: string, serverUpdatedAt: string) => void
}

/** Matches `getInitialStepData()` — server drafts often have `mode: null` until step 2 is saved. */
export const DEFAULT_WIZARD_MODE = 'light' as const

/** Align hydrated drafts with the standard new-brief flow (`mode: 'light'`). */
export function normalizeWizardStepData(data: BrandStepData): BrandStepData {
  return {
    ...data,
    stepLayoutVersion: 2,
    mode: data.mode ?? DEFAULT_WIZARD_MODE,
  }
}

/** Build wizard stepData from a brand API row (shared by router + landing). */
export function buildStepDataFromBrand(brand: Brand): BrandStepData {
  if (brand.stepData) {
    const data = normalizeWizardStepData(brand.stepData)
    return {
      ...data,
      visualComponents: {
        ...data.visualComponents,
        delegateToDesigners:
          Boolean(brand.delegateToDesigners) || Boolean(data.visualComponents.delegateToDesigners),
        selections: data.visualComponents.selections ?? brand.componentSelections ?? {},
      },
    }
  }

  return normalizeWizardStepData({
    stepLayoutVersion: 2,
    brandBasics: {
      geo: brand.geo ? brand.geo.split(',') : [],
      launchDate: brand.launchDate ?? '',
      linkedProduct: '',
      comment: '',
    },
    mode: brand.mode,
    concept: {
      selectedId: brand.conceptId ?? null,
      comment: brand.conceptComment ?? '',
      newConceptBrief: brand.newConceptBrief ?? null,
    },
    externalNaming: {
      selectedIds: brand.externalNamingIds ?? [],
      comment: brand.externalNamingComment ?? '',
      newNamingBrief: brand.newNamingBrief ?? null,
    },
    internalNaming: {
      selectedId: brand.internalNamingId ?? null,
      comment: brand.internalNamingComment ?? '',
      newNamingFeedback: null,
    },
    marketingPackage: {
      selectedId: brand.prPackageId ?? null,
      comment: brand.prPackageComment ?? '',
    },
    deliverables: {
      legalLanding: brand.legalLanding ?? false,
      partnerLanding: brand.partnerLanding ?? false,
      developmentDeadline: brand.developmentDeadline ?? '',
      comment: brand.deliverablesComment ?? '',
    },
    visualComponents: {
      selections: brand.componentSelections ?? {},
      delegateToDesigners: brand.delegateToDesigners ?? false,
      comment: brand.componentsComment ?? '',
    },
  })
}

export function clampWizardStep(step: number): number {
  if (!Number.isFinite(step) || step < 1) return 1
  return Math.min(8, Math.max(1, step))
}

export function brandDisplayName(brand: Pick<Brand, 'internalName' | 'id'>): string {
  return brand.internalName?.trim() || `Brand ${brand.id.substring(0, 8)}…`
}

export function applyBrandToStore(store: ConstructorStoreBrandLoader, brand: Brand): void {
  store.loadBrand(
    brand.id,
    buildStepDataFromBrand(brand),
    clampWizardStep(brand.currentStep ?? 1),
    brand.status,
    brand.internalName ?? undefined,
    brand.ceoComments ?? undefined,
    brand.ceoSelections ?? undefined,
    brand.ordersReadyAt ?? null,
    brand.updatedAt
  )
  // After `loadBrand` — overlays the Author's unsaved answers, if any.
  store.restoreWizardDraftCopy(brand.id, brand.updatedAt)
}

export function wizardStepLocation(
  step: number,
  brandId?: string | null,
  editBrand?: string | null
): { path: string; query?: Record<string, string> } {
  const query: Record<string, string> = {}
  if (brandId) query.brand = brandId
  if (editBrand) query.editBrand = editBrand
  const path = `/constructor/step/${clampWizardStep(step)}`
  return Object.keys(query).length > 0 ? { path, query } : { path }
}

export function formatDraftUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}
