<script setup lang="ts">
// Variant 3 — Wizard embedded as a tab inside the Admin layout.
//
// The Wizard is a separate SPA (Vue3 + Tailwind) served same-origin at
// `/wizard/*`. Embedding it via a same-origin iframe keeps the Admin sidebar
// visible, isolates the Wizard's Tailwind Preflight from the Admin's SCSS, and
// lets the Wizard's own viewport-scale logic fit itself into this content area
// — all without touching the Wizard's business logic.
//
// The shared HttpOnly auth cookie is sent on the iframe's same-origin
// requests, so the Wizard resolves the current user with no extra login. The
// only cross-frame contract is `postMessage` (see useEmbedBridge in the
// constructor package): `ready`, `done`, `auth-required`.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildWizardIframeSrc } from '@/utils/wizardLink'

interface WizardNavigatedPayload {
  brandId?: string | null
  step?: number | null
  path?: string
}

interface WizardBridgeMessage {
  source?: string
  type?: 'ready' | 'done' | 'auth-required' | 'navigated'
  payload?: unknown
}

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)

// The iframe `src` is computed ONCE at mount and then frozen. Live in-iframe
// navigation is mirrored into the Admin URL (see the `navigated` handler) so a
// full-page reload (F5) reconstructs the correct starting route — but that URL
// sync must NOT recompute this src, or the still-running Wizard would reload
// mid-flow. Genuine brand switches always pass through the Brands list, which
// destroys and re-creates this component, so a fresh mount recomputes here.
function buildInitialSrc(): string {
  if (route.name === 'workspace-brand') {
    const id = route.params.id as string
    const stepRaw = route.query.step
    const step = typeof stepRaw === 'string' ? Number.parseInt(stepRaw, 10) : Number.NaN
    // Steps 1-7 = draft continuation; step 8 / no step = final review page.
    if (Number.isFinite(step) && step >= 1 && step < 8) {
      return buildWizardIframeSrc(`/constructor/step/${step}?brand=${id}`)
    }
    return buildWizardIframeSrc(`/constructor/brand/${id}`)
  }
  return buildWizardIframeSrc('/')
}

const iframeSrc = ref(buildInitialSrc())

// Stable key for the iframe's lifetime. The old per-id key forced a remount on
// the new -> brand URL transition; we now want that transition (our own sync
// replace) to leave the mounted iframe untouched.
const iframeKey = 'wizard-frame'

function syncAdminUrl(payload: WizardNavigatedPayload) {
  const brandId = payload.brandId
  if (!brandId) return

  const step = typeof payload.step === 'number' ? payload.step : null
  const query = step && step >= 1 && step < 8 ? { step: String(step) } : {}

  // Skip when the Admin URL already matches — avoids redundant navigations
  // (vue-router rejects duplicates) and any postMessage <-> replace loop.
  const sameBrand = route.name === 'workspace-brand' && route.params.id === brandId
  const sameStep = String(route.query.step ?? '') === String((query as { step?: string }).step ?? '')
  if (sameBrand && sameStep) return

  // `replace` (not `push`) so the reload-restore URL doesn't pollute history.
  // The frozen `iframeSrc`/`iframeKey` mean this does not disturb the iframe.
  void router.replace({ name: 'workspace-brand', params: { id: brandId }, query })
}

function handleMessage(event: MessageEvent<WizardBridgeMessage>) {
  // Same-origin only. Ignore anything from another origin or another sender.
  if (event.origin !== window.location.origin) return
  const data = event.data
  if (!data || data.source !== 'brand-wizard') return

  switch (data.type) {
    case 'ready':
      isLoading.value = false
      break
    case 'auth-required':
      // Cookie expired mid-session. Google Sign-In does not render reliably
      // inside an iframe, so break out to a top-level reload — the Admin's own
      // router guard then routes to the (top-level) login page.
      window.location.reload()
      break
    case 'done':
      // Brand saved/submitted. The Wizard shows its own success screen inside
      // the iframe; the user returns via the header "Brands" button. No
      // forced navigation here to keep the existing Wizard flow intact.
      break
    case 'navigated':
      // Mirror the Wizard's current brand + step into the Admin URL so F5
      // restores the same place. Does not touch the running iframe.
      syncAdminUrl((data.payload ?? {}) as WizardNavigatedPayload)
      break
  }
}

function handleIframeLoad() {
  // Fallback in case the bridge `ready` message is missed (e.g. legacy build
  // without the bridge): the raw load event still clears the loader.
  isLoading.value = false
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="wizard-workspace">
    <div v-if="isLoading" class="wizard-workspace__loading">
      <span class="wizard-workspace__spinner" />
      <span>Loading wizard…</span>
    </div>
    <iframe
      :key="iframeKey"
      :src="iframeSrc"
      class="wizard-workspace__frame"
      title="Brand Wizard"
      @load="handleIframeLoad"
    />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;
@use '@/styles/variables' as *;

.wizard-workspace {
  position: relative;
  width: 100%;
  height: 100%;

  &__frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }

  &__loading {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-3;
    background-color: $color-bg;
    color: $color-text-secondary;
    font-size: $font-size-sm;
  }

  &__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid $color-border;
    border-top-color: $color-primary;
    border-radius: 50%;
    animation: wizard-workspace-spin 0.8s linear infinite;
  }
}

@keyframes wizard-workspace-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
