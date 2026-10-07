import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { reloadAfterRelease, router } from './router';
import { useAuthStore } from './stores/auth';
import './styles/global.scss';

// Older versions of this SPA persisted the auth payload (user + JWT) under
// `brand_constructor_auth` in localStorage. The current implementation
// keeps auth entirely in Pinia + HttpOnly cookie and never reads this key,
// but the orphaned entry would stay in returning browsers indefinitely.
// Wipe it on every boot so "no auth state in localStorage" stays a hard
// invariant of the SPA.
try {
  localStorage.removeItem('brand_constructor_auth');
} catch {
  // localStorage may be unavailable in iframes / SSR / private mode quirks —
  // a missing item is exactly the state we want, so swallow silently.
}

// After a release the old page asks for code chunks that no longer exist and
// a screen opens blank. Vite reports it as `vite:preloadError`: load the page
// anew once to get the new build — at the tab that was clicked, not at the
// address the page is on, or the click looks like it did nothing (owner,
// 07.10). The 10-second mark stops a loop if the chunk is really missing from
// the new build too.
window.addEventListener('vite:preloadError', event => {
  const KEY = 'preload-error-reload-at';
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // no sessionStorage: still reload once, the browser is in a broken state
  }
  if (Date.now() - last < 10_000) return;
  if (reloadAfterRelease()) event.preventDefault();
});

const app = createApp(App);

app.use(createPinia());

// Hydrate the auth store from the HttpOnly cookie BEFORE installing the
// router. Vue Router 4's `app.use(router)` synchronously kicks off the
// initial navigation via `router.install()` → internal `push(window.location)`,
// which runs the beforeEach guard immediately. If the router is installed
// before `/api/auth/me` resolves, the guard sees `user.value === null` and
// would bounce an authenticated F5 to /login even though the cookie is
// valid. Installing the router only after the await guarantees the very
// first navigation sees the final auth state.
void (async () => {
  const authStore = useAuthStore();
  await authStore.fetchCurrentUser();
  app.use(router);
  await router.isReady();
  app.mount('#app');
})();
