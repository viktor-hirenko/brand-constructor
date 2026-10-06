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
import { useRoute, useRouter } from 'vue-router'
import { buildWizardIframeSrc } from '@/utils/wizardLink'
import { useAuthStore } from '@/stores/auth'
import { handleSessionExpired } from '@/utils/sessionExpiry'
import {
  parseWizardDim,
  wizardDimBands,
  WIZARD_DIM_OFF,
  type DimBand,
  type FrameRect,
  type WizardDimState,
} from '@/utils/wizardDim'

interface WizardNavigatedPayload {
  brandId?: string | null
  step?: number | null
  path?: string
}

interface WizardBridgeMessage {
  source?: string
  type?: 'ready' | 'done' | 'auth-required' | 'navigated' | 'close' | 'dim'
  payload?: unknown
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(true)
// Set while we hand the user over to the top-level login, so the dying iframe
// is hidden instead of flashing the Wizard's interstitial.
const isSessionEnding = ref(false)

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

// ── The wizard's dim, carried over the Admin — DP-15450, Concept Selection 6 ──
// While a wizard modal, drawer or full-screen view is open, the same black lies
// over this Admin's menu and bar, as bands around the frame (never over it).
// A click on it is sent back to the wizard as a click on its own dark area.
const frameRef = ref<HTMLIFrameElement | null>(null)
const dim = ref<WizardDimState>(WIZARD_DIM_OFF)
const frameRect = ref<FrameRect>({ left: 0, top: 0, right: 0, bottom: 0 })
const viewport = ref({ width: 0, height: 0 })
let frameObserver: ResizeObserver | null = null

function measureFrame() {
  const el = frameRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  frameRect.value = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
}

const dimBands = computed(() => wizardDimBands(frameRect.value, viewport.value))

const dimStyle = computed(() => ({
  backgroundColor: `rgba(0, 0, 0, ${dim.value.alpha})`,
  transition: `background-color ${dim.value.fadeMs}ms ease`,
  pointerEvents: dim.value.alpha > 0 ? ('auto' as const) : ('none' as const),
}))

function bandStyle(band: DimBand) {
  return {
    ...dimStyle.value,
    left: `${band.left}px`,
    top: `${band.top}px`,
    width: `${band.width}px`,
    height: `${band.height}px`,
  }
}

function forwardDimClick() {
  frameRef.value?.contentWindow?.postMessage(
    { source: 'brand-admin', type: 'backdrop-click' },
    window.location.origin,
  )
}

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
      // The Wizard found no valid session. Sign-in cannot happen in the frame
      // (Google Sign-In is unsupported there, and a login card inside the Admin
      // shell reads as a broken page), so break out to the top-level login.
      //
      // A bare `reload()` used to be enough only by accident — it relied on the
      // Admin guard re-running after boot. Going straight to /login is
      // deterministic and carries the return path, so the user lands back on
      // this brand and step after signing in.
      isSessionEnding.value = true
      authStore.clearSession()
      handleSessionExpired({ redirect: route.fullPath })
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
    case 'dim':
      measureFrame()
      dim.value = parseWizardDim(data.payload)
      break
    case 'close':
      // The kit's Wizard header (`5382:30951`) draws a close cross at the right
      // edge of every wizard screen. The mockup has no Admin header, so there
      // the cross IS the exit from a brand; here it does exactly what the
      // header's "← Brands" button does. The wizard saves as it goes, so
      // leaving discards nothing.
      void router.push({ name: 'brands' })
      break
  }
}

function handleIframeLoad() {
  // Fallback in case the bridge `ready` message is missed (e.g. legacy build
  // without the bridge): the raw load event still clears the loader.
  isLoading.value = false
  // A frame that (re)loaded has no modal open, whatever it reported before.
  dim.value = WIZARD_DIM_OFF
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  window.addEventListener('resize', measureFrame)
  if (frameRef.value && typeof ResizeObserver !== 'undefined') {
    frameObserver = new ResizeObserver(measureFrame)
    frameObserver.observe(frameRef.value)
  }
  measureFrame()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  window.removeEventListener('resize', measureFrame)
  frameObserver?.disconnect()
})
</script>

<template>
  <div class="wizard-workspace">
    <div v-if="isLoading || isSessionEnding" class="wizard-workspace__loading">
      <span class="wizard-workspace__spinner" />
      <span>{{ isSessionEnding ? 'Сесія завершилась — переходимо до входу…' : 'Завантаження брифу…' }}</span>
    </div>
    <iframe
      v-show="!isSessionEnding"
      ref="frameRef"
      :key="iframeKey"
      :src="iframeSrc"
      class="wizard-workspace__frame"
      title="Бриф бренду"
      @load="handleIframeLoad"
    />
    <Teleport to="body">
      <div
        v-for="(band, i) in dimBands"
        :key="i"
        class="wizard-workspace__dim"
        :style="bandStyle(band)"
        aria-hidden="true"
        @click="forwardDimClick"
      />
    </Teleport>
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

  // Above everything the Admin draws (its sidebar, bar and off-canvas menu);
  // the bands lie around the frame and leave it uncovered.
  &__dim {
    position: fixed;
    z-index: 9999;
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
