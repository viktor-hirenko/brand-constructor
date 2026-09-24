<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { isEmbedded } from '@/composables/useEmbedMode';
import { postAuthRequired } from '@/composables/useEmbedBridge';
import LoaderIcon from '@/components/icons/LoaderIcon.vue';
import UiAlert from '@/components/ui/UiAlert.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Embedded in the Admin iframe, this view must never offer sign-in: Google
// Sign-In is unsupported in an iframe, and a login card inside the Admin shell
// looks like a broken page. We render a neutral interstitial and ask the parent
// to take the user to the top-level login instead.
const embedded = isEmbedded();

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

  if (embedded) {
    // Re-assert the break-out request. The router hook already posted it, but
    // reaching this view at all means the hand-off has not happened yet.
    postAuthRequired();
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

/**
 * DP-15258 phase 19 — the last SCSS file in the tree became Tailwind here, and
 * `styles/{_variables,_mixins,global}.scss` went with it.
 *
 * The kit has NO login screen: `get_metadata` on the key-screens canvas
 * `4016:4712` returns 2146 nodes and not one is named login / sign in / auth /
 * Google, and `search_design_system` finds no such component in the
 * Brand-Builder library. So nothing here is copied from Figma — every value is
 * borrowed from a recipe the product already ships, and the borrow is named:
 *
 *   page bg      `--color-background` #f8f8f8 (was #f8fafc, a Tailwind-preset
 *                slate that predates the kit)
 *   card         `UiSectionCard` — radius 16, 1px `--color-ink-300` #eaeaeb,
 *                white fill. The kit's one card recipe carries no shadow, so
 *                the old `shadow-lg` is gone; divergences row 69 records it
 *   padding 24   `UiModal` body (`p-6`) — the kit step nearest the old 40
 *   title        `UiStepHeader` title: `header/l` 24/32 medium, ink-900
 *   subtitle     `UiStepHeader` description: 16/24 regular, ink-700
 *   error        `UiAlert type="error"` — the same box `UiAsyncState` uses,
 *                replacing a hand-rolled #fff1f0 / #ffa39e pair
 *   spinner      `LoaderIcon` + `animate-spin`, as in `AuthorActionsFooter`,
 *                replacing a hand-rolled @keyframes border rotation
 *
 * `100dvh` is legal on THIS view and nowhere inside the wizard: "Железные
 * правила адаптива" bans `vh`/`dvh` because the wizard shell multiplies them by
 * its own `transform: scale()`. Login is routed straight off `App.vue` with no
 * shell and no transform above it, so `dvh` here is the plain viewport — which
 * is what the SCSS it replaces already did.
 */
const LOGIN_PAGE_CLASS = 'login flex min-h-[100dvh] items-center justify-center bg-background p-4';
</script>

<template>
  <div v-if="embedded" :class="LOGIN_PAGE_CLASS">
    <div class="flex flex-col items-center gap-4">
      <LoaderIcon class="size-7 animate-spin text-ink-700" />
      <p class="text-center text-base text-ink-700">
        Сесія завершилась. Перенаправляємо на вхід…
      </p>
    </div>
  </div>

  <div v-else :class="LOGIN_PAGE_CLASS">
    <div
      class="box-border flex w-full max-w-[25rem] flex-col items-center rounded-2xl border border-ink-300 bg-white p-6"
    >
      <span class="text-[2.5rem]/none text-primary" aria-hidden="true">◈</span>

      <h1 class="mt-4 text-center text-2xl font-medium text-ink-900">Brand Constructor</h1>
      <p class="mt-2 text-center text-base text-ink-700">Увійдіть для продовження</p>

      <div class="mt-8 flex w-full flex-col items-center gap-4">
        <UiAlert v-if="error" type="error" :description="error" />

        <div v-if="isLoading" class="flex items-center gap-2 text-base text-ink-700">
          <LoaderIcon class="size-6 animate-spin" />
          <span>Вхід...</span>
        </div>

        <div v-show="!isLoading" ref="buttonContainer" class="flex w-full justify-center" />

        <p class="max-w-[16.25rem] text-center text-xs text-ink-600">
          Доступ обмежено авторизованими членами команди.
        </p>
      </div>
    </div>
  </div>
</template>
