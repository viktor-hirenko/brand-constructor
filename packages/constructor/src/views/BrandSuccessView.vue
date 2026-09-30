<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { useJiraInitiativePoll } from '@/composables/useJiraInitiativePoll'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import RevisionReturnIcon from '@/components/icons/RevisionReturnIcon.vue'
import SendIcon from '@/components/icons/SendIcon.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { postClose } from '@/composables/useEmbedBridge'
import { isEmbedded } from '@/composables/useEmbedMode'

/**
 * The three actions are kit Buttons at L-48 — Primary, Secondary, Ghost.
 *
 * This screen has no mockup (the key screens cover steps 2, 3, 4, 7, 8 only;
 * open question 5 says such screens keep their layout and get kit elements),
 * so only the controls move. They were 50 tall with radius 10 — the same two
 * off-kit numbers DP-15258 phase 1 corrected in the wizard footer, and they
 * become 48 and 8 here for the same reason.
 */

const router = useRouter()
const store = useConstructorStore()
const { brandId } = storeToRefs(store)
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

const shouldPollJira = computed(
  () =>
    store.successType === 'approved' ||
    (store.successType === 'submitted' && hasNewBriefs.value)
)

const { jiraKey, jiraUrl, isPending: isJiraPending } = useJiraInitiativePoll(
  brandId,
  shouldPollJira
)

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

/**
 * Leaves the wizard for the brand list — the same exit as the header cross
 * (`BriefShellView` `leaveWizard`). Inside the Admin the old «на головну» sent
 * the frame to the wizard's own landing, a page from the standalone days that
 * has no way back to the list; the Admin's home is Brands. Owner 30.09.
 * Standalone there is no list, so it keeps going to the landing.
 */
function handleBackToBrands() {
  if (isEmbedded()) {
    postClose()
    return
  }
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
          <div v-if="shouldPollJira" class="flex justify-between items-center gap-4">
            <span class="text-sm text-muted-foreground shrink-0">Jira Initiative</span>
            <span v-if="isJiraPending" class="text-sm text-muted-foreground">Створюється…</span>
            <a
              v-else-if="jiraUrl"
              :href="jiraUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-medium text-primary hover:underline"
            >
              {{ jiraKey ?? 'Відкрити в Jira' }}
            </a>
            <span v-else class="text-sm text-muted-foreground">Незабаром з’явиться</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <UiButton
            v-if="
              store.brandId &&
              store.successType !== 'submitted' &&
              store.successType !== 'needs_revision' &&
              store.successType !== 'approved'
            "
            variant="primary"
            size="L"
            class="brand-success__view-button w-full"
            @click="router.push(`/constructor/brand/${store.brandId}`)"
          >
            Переглянути бриф
          </UiButton>
          <UiButton
            v-if="successConfig.showCreateNew && authStore.canStartNewBrandBrief"
            variant="secondary"
            size="L"
            class="brand-success__new-brief-button w-full"
            @click="handleNewBrief"
          >
            Створити новий бриф
          </UiButton>
          <UiButton
            variant="ghost"
            size="L"
            class="brand-success__home-button w-full"
            @click="handleBackToBrands"
          >
            До списку брендів
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
