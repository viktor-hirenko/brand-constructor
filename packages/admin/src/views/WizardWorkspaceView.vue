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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { buildWizardIframeSrc } from '@/utils/wizardLink'

interface WizardBridgeMessage {
  source?: string
  type?: 'ready' | 'done' | 'auth-required'
  payload?: unknown
}

const route = useRoute()
const isLoading = ref(true)

// New-brand flow lands on the Wizard entry ('/'); an existing brand opens its
// review/continue route. `id` is validated by the route param.
const iframeSrc = computed(() => {
  if (route.name === 'workspace-brand') {
    const id = route.params.id as string
    return buildWizardIframeSrc(`/constructor/brand/${id}`)
  }
  return buildWizardIframeSrc('/')
})

// Re-mount the iframe when the target brand changes so the Wizard cold-starts
// on the correct route (rather than relying on in-iframe SPA navigation).
const iframeKey = computed(() => String(route.params.id ?? 'new'))

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
