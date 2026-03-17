<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const error = ref<string | null>(null);
const isLoading = ref(false);
const buttonContainer = ref<HTMLElement | null>(null);
let scriptEl: HTMLScriptElement | null = null;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

function initGoogleSignIn() {
  if (!window.google || !buttonContainer.value) return;

  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });

  window.google.accounts.id.renderButton(buttonContainer.value, {
    theme: 'outline',
    size: 'large',
    width: 300,
    text: 'signin_with',
    shape: 'rectangular',
  });
}

async function handleCredentialResponse(response: { credential: string }) {
  error.value = null;
  isLoading.value = true;
  try {
    await authStore.loginWithGoogle(response.credential);
    const redirect = (route.query.redirect as string) || '/constructor';
    router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Помилка входу. Спробуйте ще раз.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.replace('/constructor');
    return;
  }

  scriptEl = document.createElement('script');
  scriptEl.src = 'https://accounts.google.com/gsi/client';
  scriptEl.async = true;
  scriptEl.defer = true;
  scriptEl.onload = initGoogleSignIn;
  document.head.appendChild(scriptEl);
});

onUnmounted(() => {
  if (scriptEl) {
    document.head.removeChild(scriptEl);
    scriptEl = null;
  }
});
</script>

<template>
  <div class="login">
    <div class="login__card">
      <div class="login__logo">
        <span class="login__logo-icon">◈</span>
      </div>
      <h1 class="login__title">Brand Constructor</h1>
      <p class="login__subtitle">Увійдіть для продовження</p>

      <div class="login__body">
        <p v-if="error" class="login__error">{{ error }}</p>

        <div v-if="isLoading" class="login__loading">
          <span>Вхід...</span>
        </div>

        <div v-show="!isLoading" ref="buttonContainer" class="login__google-btn" />

        <p class="login__hint">Доступ обмежено авторизованими членами команди.</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.login {
  min-height: 100dvh;
  @include flex-center;
  padding: $spacing-4;
  background: $color-bg;

  &__card {
    @include card;
    padding: $spacing-10;
    text-align: center;
    max-width: 400px;
    width: 100%;
    box-shadow: $shadow-lg;
  }

  &__logo {
    margin-bottom: $spacing-4;
  }

  &__logo-icon {
    font-size: 40px;
    color: $color-primary;
  }

  &__title {
    @include heading-2;
    margin-bottom: $spacing-2;
  }

  &__subtitle {
    @include small-text;
    color: $color-text-secondary;
    margin-bottom: $spacing-8;
  }

  &__body {
    @include flex-column;
    align-items: center;
    gap: $spacing-4;
  }

  &__google-btn {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  &__loading {
    @include small-text;
    color: $color-text-secondary;
    padding: $spacing-3;
  }

  &__error {
    width: 100%;
    padding: $spacing-3 $spacing-4;
    background-color: #fff1f0;
    border: 1px solid #ffa39e;
    border-radius: $radius-md;
    @include small-text;
    color: $color-error;
    text-align: left;
  }

  &__hint {
    font-size: $font-size-xs;
    color: $color-text-muted;
    max-width: 260px;
    line-height: $line-height-normal;
  }
}
</style>
