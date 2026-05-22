<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import RevisionReturnIcon from '@/components/icons/RevisionReturnIcon.vue'
import SendIcon from '@/components/icons/SendIcon.vue'

const router = useRouter()
const store = useConstructorStore()
const authStore = useAuthStore()

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
          <SendIcon
            v-if="store.successType === 'submitted'"
            class="size-8"
            :class="successConfig.iconColor"
          />
          <RevisionReturnIcon
            v-else-if="store.successType === 'needs_revision'"
            class="size-8"
            :class="successConfig.iconColor"
          />
          <CheckIcon
            v-else
            class="size-8"
            :class="successConfig.iconColor"
          />
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
            <span class="text-sm font-medium" :class="successConfig.statusColor">{{
              successConfig.statusLabel
            }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="
              store.brandId &&
              store.successType !== 'submitted' &&
              store.successType !== 'needs_revision' &&
              store.successType !== 'approved'
            "
            class="w-full h-[50px] bg-primary text-primary-foreground rounded-[10px] hover:opacity-90 transition-all text-base font-medium"
            @click="router.push(`/constructor/brand/${store.brandId}`)"
          >
            Переглянути бриф
          </button>
          <button
            v-if="successConfig.showCreateNew && authStore.canStartNewBrandBrief"
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
