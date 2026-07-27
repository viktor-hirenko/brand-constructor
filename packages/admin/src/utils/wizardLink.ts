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

/**
 * Open an existing brand in the Wizard (review / continue).
 *
 * `step` is the brand's last saved wizard step. For a draft still in progress
 * (steps 1-7) we reopen exactly there — parity with the F5 route-restore, so
 * opening from the Brands list lands where a reload would. Non-drafts (and
 * step 8) fall through to the brand review page.
 */
export function openBrandInWizard(
  router: Router,
  brandId: string,
  step?: number | null
): void {
  const atStep = typeof step === 'number' && step >= 1 && step < 8
  if (legacyBase) {
    const path = atStep
      ? `/constructor/step/${step}?brand=${brandId}`
      : `/constructor/brand/${brandId}`
    window.open(`${legacyBase}${path}`, '_blank')
    return
  }
  router.push({
    name: 'workspace-brand',
    params: { id: brandId },
    query: atStep ? { step: String(step) } : {},
  })
}

/** Start a new brand brief — lands on the Wizard entry (Product Owner flow). */
export function createBrandInWizard(router: Router): void {
  if (legacyBase) {
    window.open(`${legacyBase}/`, '_blank')
    return
  }
  router.push({ name: 'workspace-new' })
}
