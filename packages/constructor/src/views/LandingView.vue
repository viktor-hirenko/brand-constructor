<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConstructorStore } from '@/stores/constructor'
import { apiGet, apiPost } from '@/composables/useApi'
import { useLandingDrafts } from '@/composables/useLandingDrafts'
import { isEmbedded } from '@/composables/useEmbedMode'
import { postClose } from '@/composables/useEmbedBridge'
import { useViewportScale } from '@/composables/useViewportScale'
import {
  DESIGN_SHELL_HEIGHT,
  DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
  DESIGN_SHELL_WIDTH,
} from '@/constants/layoutShell'
import ConstructorDualPaneShell from '@/components/constructor/layout/ConstructorDualPaneShell.vue'
import UiWizardHeader from '@/components/ui/UiWizardHeader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import LandingDraftCta from '@/components/landing/LandingDraftCta.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import SwatchesIcon from '@/components/icons/SwatchesIcon.vue'
import TextAaIcon from '@/components/icons/TextAaIcon.vue'
import FigmaLogoIcon from '@/components/icons/FigmaLogoIcon.vue'
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue'
import type { Brand, BrandListItem } from '@brand-constructor/shared/types'
import {
  applyBrandToStore,
  clampWizardStep,
  wizardStepLocation,
} from '@/utils/brandHydration'

/**
 * Step 0 of the wizard — kit `Brand Creation (step 0)` `5409:35125`, 1440×768.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5409-35125&m=dev
 *
 * ── It is a wizard screen, not a page of its own ─────────────────────────────
 * The frame is the same `Wizard` as every other screen: `Wizard header` 1230×73
 * on top, then the 591 · 639 row, then the vertical `Divider` between them.
 * Until this work the landing was a hand-rolled 50/50 card floating in the
 * middle of the viewport, with its own radius, its own shadow and none of the
 * measured column arithmetic — so it agreed with no drawn frame at any width.
 * Now it renders through the same shell, which is what makes its columns come
 * out at the designer's numbers on her four windows.
 *
 * ── What the header does and does not carry ─────────────────────────────────
 * `get_design_context` on the header instance `5409:35128` returns the title
 * and the close glyph and nothing else: on step 0 the step counter and the
 * progress rule are both switched off. Leaving `currentStep` / `totalSteps`
 * unset is exactly that, so no new prop was needed.
 *
 * ── Measured off the nodes, not transcribed ─────────────────────────────────
 *   Container `5409:35133`   527 × 344 at x=32, y=175.5 of a 695 panel, i.e.
 *                            the pane's own 32 padding and 344 centred in what
 *                            is left. `gap/32` between the text block and the
 *                            feature list.
 *   Title `5409:35688`       40/48 weight 500 `step header/title` #1f1f2e,
 *                            letter-spacing 0, two lines, nothing above it —
 *                            the `Title + Badge` frame ships its badge slot
 *                            empty, and our "Brand builder" chip is in no kit
 *                            section (divergences row 28).
 *   Description `5409:35690` `body/regular` 16/24 `step header/description`
 *                            #6f6f7d across the full 527, `gap/16` under the
 *                            title, and it ends in a full stop.
 *   Button `5409:35672`      kit Primary L-48 with a 24 `Sparkle` on the RIGHT,
 *                            `gap/24` under the description.
 *   Features `5409:35766`    two rows of two, rows 16 apart and columns 24;
 *                            each item is a 32 tile (`p-8`, radius 8, `bg/alt-3`
 *                            #eaeaeb) holding a 16 glyph, `gap/8`, then
 *                            `caption/m/medium` 12/16 in `content/primary`.
 *   Right panel `5409:35332` one picture, 639 wide, centred and cropped by the
 *                            pane — no padding, no radius, no card.
 */

const router = useRouter()
const authStore = useAuthStore()
const store = useConstructorStore()

// Same as every other wizard screen: embedded fills the panel, standalone is
// the fixed 1440×900 measuring card.
const embedded = isEmbedded()

const { scale: shellScale } = useViewportScale({
  baseWidth: DESIGN_SHELL_WIDTH,
  baseHeight: DESIGN_SHELL_HEIGHT,
  minViewportWidth: DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
  disabled: embedded,
})

const COVER_IMAGE =
  'https://raw.githubusercontent.com/lukaguzenko/brand-constructor-assets/a61fff81678850a0ead1e39a7a3770237d50ef5a/others/cover_1.png'

/**
 * All four labels are use cases in the designer's Icon mapping table
 * (`5658:39246`), which assigns each one a glyph by name:
 * Креативні концепти → Swatches, Неймінги → TextAa, UI рішення → FigmaLogo,
 * Маркетінговий розвіток → TrendUp. Only the last one matched before.
 */
const features = [
  { label: 'Креативні концепти', icon: 'swatches' },
  { label: 'Неймінги', icon: 'text-aa' },
  { label: 'UI рішення', icon: 'figma' },
  { label: 'Маркетінговий розвіток', icon: 'trending' },
] as const

const creating = ref(false)
const actionError = ref<string | null>(null)

const showButton = computed(() => {
  return !authStore.isAuthenticated || authStore.canStartNewBrandBrief
})

const useDraftAwareCta = computed(
  () => authStore.isAuthenticated && authStore.canStartNewBrandBrief
)

const { drafts, loading, fetchDrafts } = useLandingDrafts(() => useDraftAwareCta.value)

/**
 * The kit draws the header's close glyph on step 0, but standalone there is
 * nothing behind this screen to close to — it IS the root route. So the control
 * appears only where it can act: embedded, where it does what the Admin's own
 * "← Brands" does. Same reading as on the wizard steps.
 */
function handleClose(): void {
  if (embedded) postClose()
}

async function navigateToDraft(brand: Brand) {
  applyBrandToStore(store, brand)
  const step = clampWizardStep(brand.currentStep ?? 1)
  await router.push(wizardStepLocation(step, brand.id))
}

async function continueDraft(listItem: BrandListItem) {
  if (creating.value) return
  creating.value = true
  actionError.value = null

  try {
    store.reset()
    const brand = await apiGet<Brand>(`/api/brands/${listItem.id}`)
    await navigateToDraft(brand)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Не вдалося відкрити чернетку'
  } finally {
    creating.value = false
  }
}

async function createNewBrand() {
  if (creating.value) return
  actionError.value = null

  if (!authStore.isAuthenticated) {
    await router.push('/constructor/step/1')
    return
  }

  creating.value = true

  try {
    store.reset()
    const brand = await apiPost<Brand>('/api/brands', { currentStep: 1 })
    await navigateToDraft(brand)
    void fetchDrafts()
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Не вдалося створити бриф'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div
    class="constructor-layout h-[100dvh] bg-background flex overflow-hidden"
    :class="embedded ? '' : 'items-center justify-center'"
  >
    <ConstructorDualPaneShell
      layout-mode="landing"
      :scale="shellScale"
      :embed="embedded"
    >
      <template #header>
        <UiWizardHeader :show-close="embedded" @close="handleClose" />
      </template>

      <!-- `Container` `5409:35133` — 527 × 344, `gap/32`. Its width and its
           vertical centring come from the pane's own 32 padding, so there is no
           size here to keep in step with the kit. -->
      <div class="landing-view__block flex flex-col gap-8">
        <!-- `5409:35768` — text block and button, `gap/24`. -->
        <div class="flex flex-col gap-6">
          <!-- `Text` `5409:35686` — title and description, `gap/16`. -->
          <div class="flex flex-col gap-4">
            <h1
              class="landing-view__title text-[2.5rem] font-medium leading-[3rem] text-ink-900"
            >
              Бриф<br />на створення бренду
            </h1>
            <p class="landing-view__description text-base/6 text-ink-700">
              Заповнить бриф для роботи над новим брендом. Оберить існуючий концепт, або
              замовʼте новий.
            </p>
          </div>

          <div v-if="showButton" class="landing-view__cta flex flex-col items-start">
            <LandingDraftCta
              v-if="useDraftAwareCta"
              :drafts="drafts"
              :loading="loading"
              :creating="creating"
              @continue="continueDraft"
              @create-new="createNewBrand"
            />

            <UiButton v-else :disabled="creating" @click="createNewBrand">
              Order New Brand
              <template #icon-right="{ iconClass }">
                <SparklesIcon :class="iconClass" />
              </template>
            </UiButton>

            <p v-if="actionError" class="mt-3 text-sm text-destructive">
              {{ actionError }}
            </p>
          </div>

          <p
            v-else-if="authStore.isAuthenticated && !authStore.canStartNewBrandBrief"
            class="text-base/6 text-ink-700"
          >
            Створення брифу доступне тільки для Product Owner та Admin
          </p>
        </div>

        <!-- `5409:35766` — two rows of two: rows `gap/16`, columns `gap/24`. -->
        <div class="landing-view__features grid grid-cols-2 gap-x-6 gap-y-4">
          <div
            v-for="feature in features"
            :key="feature.icon"
            class="landing-view__feature flex items-center gap-2"
          >
            <!-- The tile is 32 because it is `p-8` around a 16 glyph — the kit
                 states the padding and the glyph, not the box. -->
            <div
              class="landing-view__feature-tile flex shrink-0 items-center justify-center rounded-lg bg-ink-300 p-2"
            >
              <SwatchesIcon v-if="feature.icon === 'swatches'" class="size-4 text-ink-900" />
              <TextAaIcon v-else-if="feature.icon === 'text-aa'" class="size-4 text-ink-900" />
              <FigmaLogoIcon v-else-if="feature.icon === 'figma'" class="size-4 text-ink-900" />
              <TrendingUpIcon
                v-else-if="feature.icon === 'trending'"
                class="size-4 text-ink-900"
              />
            </div>
            <span class="landing-view__feature-label text-xs/4 font-medium text-ink-900">
              {{ feature.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- `Right panel` `5409:35332`: the picture is 639 × 959, centred on the
           pane and cropped by it — which is what `object-cover` on a box the
           size of the pane does. No padding, no radius, no card. -->
      <template #right>
        <img
          :src="COVER_IMAGE"
          alt="Brand workspace"
          class="landing-view__cover absolute inset-0 size-full object-cover"
        />
      </template>
    </ConstructorDualPaneShell>
  </div>
</template>
