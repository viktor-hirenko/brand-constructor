import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './styles/app.css';

const app = createApp(App);

app.use(createPinia());

// F-05 / F-24: hydrate the auth store from the HttpOnly cookie BEFORE
// installing the router. Vue Router 4's `app.use(router)` synchronously
// kicks off the initial navigation via `router.install()` → internal
// `push(window.location)`, which runs the beforeEach guard immediately.
// If the router is installed before /api/auth/me resolves, the guard sees
// `user.value === null` and bounces an authenticated F5 to /login even
// though the cookie is valid. Installing the router only after the await
// guarantees the very first navigation sees the final auth state.
// Wrapped in an async IIFE rather than top-level await so the bundle
// stays compatible with Vite's default browser target (Safari 14 has no
// TLA support).
void (async () => {
  const authStore = useAuthStore();
  await authStore.fetchCurrentUser();
  app.use(router);
  await router.isReady();
  app.mount('#app');
})();
