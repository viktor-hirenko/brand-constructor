// Single entry point for "the session is gone" across the Wizard SPA.
//
// Any API call can be the one that discovers a dead cookie, and a screen
// typically fires several in parallel — so this module is single-flight: the
// first caller wins and the rest are swallowed. Without that, five concurrent
// 401s would trigger five redirects (or five postMessages) and the user would
// watch the page thrash.
//
// Embedded: the Admin owns the top-level URL, so we ask it to break out (see
// `postAuthRequired`). Standalone: a hard navigation to /login, which both
// preserves the return path and guarantees every in-memory store is dropped.
// In-progress brief data is not lost either way — the wizard mirrors a draft's
// unsaved answers to localStorage as they change (see `useWizardDraftCopy`).

import { isEmbedded } from '@/composables/useEmbedMode';
import { postAuthRequired } from '@/composables/useEmbedBridge';

let handling = false;

/** True once a session-expiry hand-off is in flight; callers should bail out. */
export function isSessionExpiryInFlight(): boolean {
  return handling;
}

/**
 * Tear down the session and hand the user to the login screen exactly once.
 *
 * `redirect` defaults to the current location so the user returns to the same
 * place after signing back in.
 */
export function handleSessionExpired(redirect?: string): void {
  if (handling) return;
  handling = true;

  if (isEmbedded()) {
    postAuthRequired();
    return;
  }

  const target = redirect ?? `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ redirect: target, reason: 'expired' });
  window.location.assign(`/login?${params.toString()}`);
}
