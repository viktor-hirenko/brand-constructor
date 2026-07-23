// Navigation from Admin into the Wizard (Variant 3 — Wizard embedded as a tab).
//
// Default (unified deploy): the Wizard lives at `/wizard/*` on the SAME origin
// and is embedded inside the Admin layout via an iframe. Admin navigation goes
// to an internal `/workspace/*` route (WizardWorkspaceView) — the sidebar stays
// visible and the Wizard renders in the content area. The auth cookie is
// shared, so no re-login happens.
//
// Legacy fallback: if `VITE_CONSTRUCTOR_URL` is set (standalone Admin pointing
// at a separate Wizard origin) we cannot embed cross-origin safely, so we open
// the Wizard in a new tab, exactly as before the integration.

import type { Router } from 'vue-router'

const legacyBase = (import.meta.env.VITE_CONSTRUCTOR_URL || '').replace(/\/+$/, '')

/** True when Admin runs standalone against a separate cross-origin Wizard. */
export const isLegacyCrossOrigin = Boolean(legacyBase)

/**
 * Build the iframe `src` for the embedded Wizard. `path` is a Wizard
 * router-relative path (e.g. '/constructor/brand/123'); it is prefixed with the
 * '/wizard' mount point of the unified single-origin deploy.
 */
export function buildWizardIframeSrc(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/wizard${clean}`
}

/** Open an existing brand in the Wizard (review / continue). */
export function openBrandInWizard(router: Router, brandId: string): void {
  if (legacyBase) {
    window.open(`${legacyBase}/constructor/brand/${brandId}`, '_blank')
    return
  }
  router.push({ name: 'workspace-brand', params: { id: brandId } })
}

/** Start a new brand brief — lands on the Wizard entry (Product Owner flow). */
export function createBrandInWizard(router: Router): void {
  if (legacyBase) {
    window.open(`${legacyBase}/`, '_blank')
    return
  }
  router.push({ name: 'workspace-new' })
}
