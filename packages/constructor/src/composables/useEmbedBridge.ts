import type { Router } from 'vue-router';

// Variant 3 — cross-frame bridge for when the Wizard runs embedded inside the
// Admin (as a same-origin iframe in WizardWorkspaceView). This is strictly
// additive: it never changes routing, guards or business logic. When the
// Wizard runs standalone (its own tab / legacy deploy) `isEmbedded()` is false
// and every function here is a no-op, so behaviour is identical to today.

interface NavigatedPayload {
  /** Brand id if the current route is bound to one (draft step or review). */
  brandId: string | null;
  /** Wizard step (1-8) from route meta, if any. */
  step: number | null;
  /** Full wizard-relative path (diagnostic; parent keys off brandId/step). */
  path: string;
}

interface EmbedMessage {
  source: 'brand-wizard';
  type: 'ready' | 'done' | 'auth-required' | 'navigated';
  payload?: unknown;
}

/** True only when this document is rendered inside a parent frame. */
function isEmbedded(): boolean {
  try {
    return window.parent !== window.self;
  } catch {
    // Cross-origin parent access throws — treat as embedded to be safe.
    return true;
  }
}

function post(type: EmbedMessage['type'], payload?: unknown): void {
  const message: EmbedMessage = { source: 'brand-wizard', type, payload };
  // Target the exact same origin: the Admin embeds the Wizard same-origin, so
  // this both scopes delivery and avoids leaking messages cross-origin.
  window.parent.postMessage(message, window.location.origin);
}

/**
 * Wire the Wizard -> Admin messages. Call once after the router is ready.
 * No-op when not embedded.
 */
export function setupEmbedBridge(router: Router): void {
  if (!isEmbedded()) return;

  // Signal the parent that the Wizard SPA is live (clears the Admin loader).
  post('ready');

  router.afterEach(to => {
    // Cookie expired / not authenticated -> the guard sends us to `login`.
    // Google Sign-In does not render reliably inside an iframe, so ask the
    // parent to break out to a top-level reload instead of showing GSI here.
    if (to.name === 'login') {
      post('auth-required');
      return;
    }
    // Brand saved/submitted -> let the parent know (used for list refresh).
    if (to.name === 'brand-success') {
      post('done');
    }

    // Route -> parent URL sync so a full-page reload (F5) restores the same
    // brand + step. The parent (WizardWorkspaceView) writes this into the
    // Admin URL; the mounted iframe is not disturbed. `brandId` lives in the
    // route params (brand-view) or the `brand` query (draft step routes).
    const brandId =
      (typeof to.params.id === 'string' && to.params.id ? to.params.id : null) ??
      (typeof to.query.brand === 'string' && to.query.brand ? to.query.brand : null);
    if (brandId) {
      const metaStep = to.meta.step;
      const step = typeof metaStep === 'number' ? metaStep : null;
      const payload: NavigatedPayload = { brandId, step, path: to.fullPath };
      post('navigated', payload);
    }
  });
}
