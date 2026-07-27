import { readonly, ref } from 'vue'

// Variant 3 — the Wizard runs either standalone (its own tab / legacy deploy)
// or embedded inside the Admin as a same-origin iframe (WizardWorkspaceView).
// Embedded mode swaps the fixed 1440×900 "card + CSS scale" layout for a fluid
// one that fills the Admin content area. Everything here is additive: when the
// Wizard is standalone, `isEmbedded()` is false and the fluid path never runs,
// so standalone behaviour is byte-for-byte identical to today.

function detectEmbedded(): boolean {
  try {
    return window.parent !== window.self
  } catch {
    // Cross-origin parent access throws — treat as embedded to be safe.
    return true
  }
}

// Frame relationship is fixed for the lifetime of the document, so detect once.
const embedded = ref(detectEmbedded())

/** True only when this document is rendered inside a parent frame (Admin iframe). */
export function isEmbedded(): boolean {
  return embedded.value
}

/** Reactive, read-only embed flag for use in templates / computed. */
export function useEmbedMode() {
  return { isEmbedded: readonly(embedded) }
}

/**
 * Marks the document root so embed-only CSS can target `<html>`.
 *
 * The fluid scale lives on the root font-size (Tailwind's rem-based utilities
 * key off `<html>`, not a nested element). Inside the iframe the viewport
 * equals the Admin panel, so `vw`/`vh` on the root map straight to the panel
 * size. Call once at boot; no-op when standalone.
 */
export function applyEmbedRootFlag(): void {
  if (!embedded.value) return
  const root = document.documentElement
  root.classList.add('wizard-embed')
  root.setAttribute('data-embed', 'true')
}
