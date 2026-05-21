import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './styles/app.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// F-05: hydrate the auth store from the HttpOnly cookie BEFORE the first
// router navigation resolves. Otherwise an authenticated user reloading a
// guarded route would see a brief login bounce (router.beforeEach would
// observe `isAuthenticated === false` while /api/auth/me is still in
// flight). Wrapped in an async IIFE rather than top-level await so the
// bundle stays compatible with Vite's default browser target (Safari 14
// has no TLA support).
void (async () => {
  const authStore = useAuthStore();
  await authStore.fetchCurrentUser();
  await router.isReady();
  app.mount('#app');
})();
