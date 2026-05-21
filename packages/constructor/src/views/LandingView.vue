<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'

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
            <svg
              class="size-4 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
              />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
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
            <svg
              class="size-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
              />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
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
                <!-- Sparkles -->
                <svg
                  v-if="feature.icon === 'sparkles'"
                  class="size-5 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
                  />
                  <path d="M20 3v4" />
                  <path d="M22 5h-4" />
                  <path d="M4 17v2" />
                  <path d="M5 18H3" />
                </svg>
                <!-- Palette -->
                <svg
                  v-else-if="feature.icon === 'palette'"
                  class="size-5 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path
                    d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
                  />
                </svg>
                <!-- Target -->
                <svg
                  v-else-if="feature.icon === 'target'"
                  class="size-5 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <!-- Trending Up -->
                <svg
                  v-else-if="feature.icon === 'trending'"
                  class="size-5 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
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
