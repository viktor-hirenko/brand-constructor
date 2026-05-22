<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import PaletteIcon from '@/components/icons/PaletteIcon.vue'
import TargetIcon from '@/components/icons/TargetIcon.vue'
import TrendingUpIcon from '@/components/icons/TrendingUpIcon.vue'

const router = useRouter()
const authStore = useAuthStore()

const COVER_IMAGE =
  'https://raw.githubusercontent.com/lukaguzenko/brand-constructor-assets/a61fff81678850a0ead1e39a7a3770237d50ef5a/others/cover_1.png'

const features = [
  { label: 'Креативні концепти', icon: 'sparkles' },
  { label: 'Неймінги', icon: 'palette' },
  { label: 'UI рішення', icon: 'target' },
  { label: 'Маркетінговий розвіток', icon: 'trending' },
] as const

const showButton = computed(() => {
  // Показываем кнопку если: не залогинен ИЛИ залогинен и имеет права
  return !authStore.isAuthenticated || authStore.canStartNewBrandBrief
})

function startConstructor() {
  router.push('/constructor/step/1')
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div
      class="w-full max-w-[1311px] h-[90vh] min-h-[740px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex"
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

          <!-- CTA Button -->
          <button
            v-if="showButton"
            class="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] hover:shadow-[0px_15px_25px_rgba(0,0,0,0.15),0px_6px_10px_rgba(0,0,0,0.1)] transition-shadow text-lg font-medium tracking-[-0.44px] cursor-pointer"
            @click="startConstructor"
          >
            Order New Brand
            <SparklesIcon class="size-5" />
          </button>

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
                <SparklesIcon v-if="feature.icon === 'sparkles'" class="size-5 text-primary" />
                <PaletteIcon v-else-if="feature.icon === 'palette'" class="size-5 text-primary" />
                <TargetIcon v-else-if="feature.icon === 'target'" class="size-5 text-primary" />
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
