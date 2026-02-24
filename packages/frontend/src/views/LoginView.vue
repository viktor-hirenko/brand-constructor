<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const error = ref<string | null>(null)
const isLoading = ref(false)

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (element: HTMLElement, config: object) => void
        }
      }
    }
  }
}

const buttonContainer = ref<HTMLElement | null>(null)
let scriptEl: HTMLScriptElement | null = null

function initGoogleSignIn() {
  if (!window.google || !buttonContainer.value) return

  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  })

  window.google.accounts.id.renderButton(buttonContainer.value, {
    theme: 'outline',
    size: 'large',
    width: 300,
    text: 'signin_with',
    shape: 'rectangular',
  })
}

async function handleCredentialResponse(response: { credential: string }) {
  error.value = null
  isLoading.value = true
  try {
    await authStore.loginWithGoogle(response.credential)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.src = 'https://accounts.google.com/gsi/client'
  scriptEl.async = true
  scriptEl.defer = true
  scriptEl.onload = initGoogleSignIn
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  if (scriptEl) {
    document.head.removeChild(scriptEl)
    scriptEl = null
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-card__logo">
        <span class="login-card__logo-icon">◈</span>
      </div>
      <h1 class="login-card__title">Brand Constructor</h1>
      <p class="login-card__subtitle">Admin Panel — sign in to continue</p>

      <div class="login-card__body">
        <p v-if="error" class="login-card__error">{{ error }}</p>

        <div v-if="isLoading" class="login-card__loading">
          <span>Signing in...</span>
        </div>

        <div v-show="!isLoading" ref="buttonContainer" class="login-card__google-btn" />

        <p class="login-card__hint">Access is restricted to authorized team members only.</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-bg;
}

.login-card {
  width: 380px;
  background-color: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-xl;
  padding: $spacing-10;
  text-align: center;
  box-shadow: $shadow-lg;

  &__logo {
    margin-bottom: $spacing-4;
  }

  &__logo-icon {
    font-size: 40px;
    color: $color-primary;
  }

  &__title {
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $color-text;
    margin-bottom: $spacing-2;
  }

  &__subtitle {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    margin-bottom: $spacing-8;
  }

  &__body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-4;
  }

  &__google-btn {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  &__loading {
    font-size: $font-size-sm;
    color: $color-text-secondary;
    padding: $spacing-3;
  }

  &__error {
    width: 100%;
    padding: $spacing-3 $spacing-4;
    background-color: #fff1f0;
    border: 1px solid #ffa39e;
    border-radius: $radius-md;
    font-size: $font-size-sm;
    color: $color-danger;
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
