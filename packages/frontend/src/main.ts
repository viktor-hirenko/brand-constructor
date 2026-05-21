import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import './styles/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// F-05: rehydrate the auth store from the HttpOnly cookie before the first
// navigation resolves — see packages/constructor/src/main.ts for the
// rationale, including why we use an async IIFE instead of top-level await.
void (async () => {
  const authStore = useAuthStore();
  await authStore.fetchCurrentUser();
  await router.isReady();
  app.mount('#app');
})();
