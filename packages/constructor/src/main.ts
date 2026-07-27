import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setupEmbedBridge } from './composables/useEmbedBridge';
import { applyEmbedRootFlag } from './composables/useEmbedMode';
import './styles/app.css';

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

// Variant 3: flag the document root as embedded BEFORE mount so the fluid
// root font-size (see `html.wizard-embed` in app.css) applies on first paint
// and the Wizard fills the Admin panel without a scale-flash. No-op standalone.
applyEmbedRootFlag();

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
//
// Wrapped in an async IIFE rather than top-level await so the bundle stays
// compatible with Vite's default browser target (Safari 14 has no TLA).
void (async () => {
  const authStore = useAuthStore();
  await authStore.fetchCurrentUser();
  app.use(router);
  await router.isReady();
  // Variant 3: wire the Admin<->Wizard postMessage bridge. No-op when the
  // Wizard is not embedded in an iframe (standalone / legacy deploy).
  setupEmbedBridge(router);
  app.mount('#app');
})();
