<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConstructorStore } from '@/stores/constructor'
import { apiGet, apiPost } from '@/composables/useApi'
import { useLandingDrafts } from '@/composables/useLandingDrafts'
import LandingDraftCta from '@/components/landing/LandingDraftCta.vue'
import LandingCtaButton from '@/components/landing/LandingCtaButton.vue'
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

const router = useRouter()
const authStore = useAuthStore()
const store = useConstructorStore()

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
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div
      class="w-full max-w-[1440px] h-[90vh] min-h-[740px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex"
    >
      <!-- Left: Content -->
      <div class="w-1/2 pl-12 flex flex-col justify-center">
        <div class="max-w-[560px]">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <SparklesIcon class="size-4 text-primary" />
            <span class="text-sm font-normal text-primary tracking-[-0.15px]">Brand builder</span>
          </div>

          <!-- Heading -->
          <h1 class="text-[48px] font-medium leading-[48px] tracking-[0.35px] mb-6">
            Бриф<br />
            <span class="text-primary">на створення бренду</span>
          </h1>

          <!-- Description -->
          <p class="text-xl text-muted-foreground leading-7 max-w-[452px] mb-8 tracking-[-0.45px]">
            Заповнить бриф для роботи над новим брендом. Оберить існуючий концепт, або замовʼте
            новий
          </p>

          <!-- CTA -->
          <LandingDraftCta
            v-if="showButton && useDraftAwareCta"
            :drafts="drafts"
            :loading="loading"
            :creating="creating"
            @continue="continueDraft"
            @create-new="createNewBrand"
          />

          <LandingCtaButton v-else-if="showButton" :disabled="creating" @click="createNewBrand">
            Order New Brand
            <SparklesIcon class="size-5" />
          </LandingCtaButton>

          <p v-if="actionError" class="text-sm text-destructive mt-3">
            {{ actionError }}
          </p>

          <!-- Сообщение для залогиненных без прав -->
          <p
            v-else-if="authStore.isAuthenticated && !authStore.canStartNewBrandBrief"
            class="text-muted-foreground text-sm mt-4"
          >
            Створення брифу доступне тільки для Product Owner та Admin
          </p>

          <!-- Features Grid -->
          <div class="grid grid-cols-2 gap-6 mt-12">
            <div v-for="feature in features" :key="feature.icon" class="flex items-center gap-3">
              <div
                class="size-10 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0"
              >
                <SwatchesIcon v-if="feature.icon === 'swatches'" class="size-5 text-primary" />
                <TextAaIcon v-else-if="feature.icon === 'text-aa'" class="size-5 text-primary" />
                <FigmaLogoIcon v-else-if="feature.icon === 'figma'" class="size-5 text-primary" />
                <TrendingUpIcon v-else-if="feature.icon === 'trending'" class="size-5 text-primary" />
              </div>
              <h4 class="font-medium text-foreground text-base tracking-[-0.31px]">
                {{ feature.label }}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Cover Image -->
      <div class="w-1/2 relative overflow-hidden">
        <img
          :src="COVER_IMAGE"
          alt="Brand workspace"
          class="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  </div>
</template>
