<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
const router = useRouter()
const store = useConstructorStore()

const brandDisplayName = computed(() => store.brandInternalName || 'New Brand')

const hasNewBriefs = computed(() => {
  const sd = store.stepData
  return (
    sd?.concept?.newConceptBrief != null ||
    sd?.externalNaming?.newNamingBrief != null ||
    sd?.internalNaming?.newNamingFeedback != null
  )
})

interface SuccessConfig {
  title: string
  subtitle: string
  iconBg: string
  iconColor: string
  dateLabel: string
  showStatus: boolean
  statusLabel: string
  statusColor: string
  showCreateNew: boolean
}

const successConfig = computed<SuccessConfig>(() => {
  switch (store.successType) {
    case 'submitted':
      return {
        title: hasNewBriefs.value ? 'Бриф відправлено в роботу!' : 'Бриф відправлено на розгляд!',
        subtitle: hasNewBriefs.value
          ? 'Повідомлення надіслано командам у Slack. Команди отримали деталі брифу.'
          : 'CEO отримає повідомлення у Slack та зможе переглянути бриф.',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        dateLabel: 'Дата відправки',
        showStatus: true,
        statusLabel: hasNewBriefs.value ? 'В роботі' : 'На розгляді',
        statusColor: 'text-blue-600',
        showCreateNew: true,
      }
    case 'needs_revision':
      return {
        title: 'Бриф повернуто на доопрацювання',
        subtitle: 'Автор отримає повідомлення у Slack.',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        dateLabel: 'Дата рішення',
        showStatus: true,
        statusLabel: 'Потребує доопрацювання',
        statusColor: 'text-orange-600',
        showCreateNew: false,
      }
    case 'approved':
      return {
        title: 'Бренд затверджено!',
        subtitle: 'Повідомлення надіслано у командні канали.',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        dateLabel: 'Дата затвердження',
        showStatus: true,
        statusLabel: 'Затверджено',
        statusColor: 'text-green-600',
        showCreateNew: false,
      }
    default:
      return {
        title: 'Бриф успішно створено!',
        subtitle: 'Ваш бриф збережено та готовий до роботи.',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        dateLabel: 'Дата створення',
        showStatus: false,
        statusLabel: '',
        statusColor: '',
        showCreateNew: true,
      }
  }
})

const createdDate = computed(() => {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
})

function handleNewBrief() {
  store.reset()
  router.push('/constructor/step/1')
}

function handleGoHome() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center p-6">
    <div class="w-full max-w-lg text-center">
      <div class="bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-12">
        <div
          class="size-16 rounded-full flex items-center justify-center mx-auto mb-6"
          :class="successConfig.iconBg"
        >
          <!-- Send icon for submitted -->
          <svg
            v-if="store.successType === 'submitted'"
            class="size-8"
            :class="successConfig.iconColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          <!-- Return icon for needs_revision -->
          <svg
            v-else-if="store.successType === 'needs_revision'"
            class="size-8"
            :class="successConfig.iconColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          <!-- Checkmark icon for approved and saved -->
          <svg
            v-else
            class="size-8"
            :class="successConfig.iconColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 class="text-2xl font-medium text-foreground mb-2">{{ successConfig.title }}</h1>
        <p class="text-muted-foreground mb-8">{{ successConfig.subtitle }}</p>

        <div class="bg-muted/50 rounded-xl p-6 mb-8 text-left space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">Назва брифу</span>
            <span class="text-sm font-medium">{{ brandDisplayName }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">{{ successConfig.dateLabel }}</span>
            <span class="text-sm font-medium">{{ createdDate }}</span>
          </div>
          <div v-if="successConfig.showStatus" class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">Статус</span>
            <span class="text-sm font-medium" :class="successConfig.statusColor">{{ successConfig.statusLabel }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="store.brandId"
            class="w-full h-[50px] bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-all text-base font-medium"
            @click="router.push(`/constructor/brand/${store.brandId}`)"
          >
            Переглянути бриф
          </button>
          <button
            v-if="successConfig.showCreateNew"
            class="w-full h-[50px] border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
            @click="handleNewBrief"
          >
            Створити новий бриф
          </button>
          <button
            class="w-full h-[50px] text-muted-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
            @click="handleGoHome"
          >
            Повернутись на головну
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
