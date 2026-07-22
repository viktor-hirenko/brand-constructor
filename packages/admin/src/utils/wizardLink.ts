// Navigation from Admin into the Wizard (Variant 3 — unified single origin).
//
// Default (unified deploy): the Wizard lives at `/wizard/*` on the SAME origin,
// so we navigate in the same tab with `window.location.assign`. The auth cookie
// is shared, so no re-login happens.
//
// Legacy fallback: if `VITE_CONSTRUCTOR_URL` is set (standalone Admin on
// brand-constructor.pages.dev pointing at the separate Wizard origin), open the
// cross-origin Wizard in a new tab, exactly as before the integration.
//
// `path` is a Wizard router-relative path (e.g. '/constructor/brand/123'); it is
// prefixed with the '/wizard' mount point for the same-origin case.

const legacyBase = (import.meta.env.VITE_CONSTRUCTOR_URL || '').replace(/\/+$/, '')

function goToWizard(path: string): void {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (legacyBase) {
    window.open(`${legacyBase}${clean}`, '_blank')
    return
  }
  window.location.assign(`/wizard${clean}`)
}

/** Open an existing brand in the Wizard (review / continue). */
export function openBrandInWizard(brandId: string): void {
  goToWizard(`/constructor/brand/${brandId}`)
}

/** Start a new brand brief — lands on the Wizard entry (Product Owner flow). */
export function createBrandInWizard(): void {
  goToWizard('/')
}
