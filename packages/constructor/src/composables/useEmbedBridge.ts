import type { Router } from 'vue-router';
import { isEmbedded } from './useEmbedMode';

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
  type: 'ready' | 'done' | 'auth-required' | 'navigated' | 'close';
  payload?: unknown;
}

function post(type: EmbedMessage['type'], payload?: unknown): void {
  const message: EmbedMessage = { source: 'brand-wizard', type, payload };
  // Target the exact same origin: the Admin embeds the Wizard same-origin, so
  // this both scopes delivery and avoids leaking messages cross-origin.
  window.parent.postMessage(message, window.location.origin);
}

/**
 * Ask the Admin to break out of the iframe and take the user to the top-level
 * login page.
 *
 * Sign-in must never happen inside the frame: Google Sign-In is not supported
 * in an iframe, and a login card rendered inside the Admin shell reads as a
 * broken page. Safe to call repeatedly — the parent de-duplicates.
 */
export function postAuthRequired(): void {
  if (!isEmbedded()) return;
  post('auth-required');
}

/**
 * Ask the Admin to leave the brand and go back to the brand list.
 *
 * The close control is the kit's own: `Wizard header` `5382:30951` draws a 24
 * cross at the right edge of every one of the 29 drawn screens. The mockup has
 * no Admin header, so in the kit this cross IS the way out of a brand; in the
 * product it does what the Admin's "← Brands" button does, which is the only
 * exit that exists today.
 *
 * No-op standalone — `BriefShellView` routes to the landing there instead.
 */
export function postClose(): void {
  if (!isEmbedded()) return;
  post('close');
}

/**
 * Register the router-driven half of the bridge.
 *
 * MUST be called BEFORE `app.use(router)`. Vue Router runs the initial
 * navigation synchronously from `router.install()`, and that is exactly the
 * navigation that redirects to `login` when the cookie is already dead on
 * load. Registering `afterEach` after `router.isReady()` would miss it, and
 * the Wizard would silently render its login screen inside the Admin shell
 * instead of asking the parent to break out.
 */
export function registerEmbedRouterHooks(router: Router): void {
  if (!isEmbedded()) return;

  router.afterEach(to => {
    // Cookie expired / not authenticated -> the guard sends us to `login`.
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

/**
 * Signal the parent that the Wizard SPA is live (clears the Admin loader).
 * Call after `app.mount()` so the loader hides only once there is something
 * painted behind it.
 */
export function postEmbedReady(): void {
  if (!isEmbedded()) return;
  post('ready');
}
