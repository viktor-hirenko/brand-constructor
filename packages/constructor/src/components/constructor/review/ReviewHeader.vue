<script setup lang="ts">
import { computed } from 'vue'

interface InfoOverride {
  title: string
  description: string
  /**
   * Override the info-block icon. Default `'check'` (circled check used for
   * status-based info blocks like "Бриф готовий!" / "Бриф на розгляді").
   * Use `'warning'` for the PO returned-from-CEO attention banner.
   */
  iconVariant?: 'check' | 'warning'
}

interface ReviewHeaderProps {
  /** Brand internal name (when known) or fallback "New Brand". */
  title: string
  /** Brand status — drives the badge/info block. */
  status: 'submitted' | 'needs_revision' | 'approved' | string
  /** Optional line under the title (e.g. PO final step instruction). */
  subtitle?: string
  /** Step index for progress row (PO draft). */
  currentStep?: number
  /** Total steps for progress row (PO draft). */
  totalSteps?: number
  /** 0–100 — shows progress bar when set (PO draft). */
  progressPercent?: number
  /** When set, replaces status-derived info block (PO “Бриф готовий!”). */
  infoOverride?: InfoOverride | null
}

const props = withDefaults(defineProps<ReviewHeaderProps>(), {
  subtitle: undefined,
  currentStep: undefined,
  totalSteps: undefined,
  progressPercent: undefined,
  infoOverride: undefined,
})

interface BadgeMeta {
  text: string
  classes: string
}

const badge = computed<BadgeMeta | null>(() => {
  switch (props.status) {
    case 'submitted':
      return { text: 'На розгляді', classes: 'bg-[#D7ECFF] text-blue-700' }
    case 'needs_revision':
      return { text: 'Потрібно доопрацювати', classes: 'bg-amber-50 text-amber-700' }
    case 'approved':
      return { text: 'Затверджено', classes: 'bg-green-50 text-green-700' }
    default:
      return null
  }
})

interface InfoMeta {
  title: string
  description: string
  iconVariant?: 'check' | 'warning'
}

const info = computed<InfoMeta | null>(() => {
  switch (props.status) {
    case 'submitted':
      return {
        title: 'Бриф на розгляді',
        description:
          'Перегляньте бриф та залиште коментарі. Затвердіть або поверніть на доопрацювання.',
      }
    case 'needs_revision':
      return {
        title: 'Бриф потребує доопрацювання',
        description:
          'Залиште коментарі у відповідних секціях, після чого замовник зможе внести зміни.',
      }
    case 'approved':
      return {
        title: 'Бриф затверджено',
        description: 'Ви затвердили цей бриф. Подальші дії — на стороні дизайн-команди.',
      }
    default:
      return null
  }
})

const displayInfo = computed<InfoMeta | null>(() => {
  // Explicit null means "hide the info block regardless of status"
  if (props.infoOverride === null) return null
  if (props.infoOverride) {
    return {
      title: props.infoOverride.title,
      description: props.infoOverride.description,
      iconVariant: props.infoOverride.iconVariant ?? 'check',
    }
  }
  return info.value
})

const showProgress = computed(
  () =>
    props.progressPercent != null &&
    props.currentStep != null &&
    props.totalSteps != null
)
</script>

<template>
  <header class="review-header space-y-6">
    <div class="review-header__heading space-y-2">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="review-header__title text-3xl font-medium tracking-[-0.6px] text-foreground">{{ title }}</h1>
        <span
          v-if="badge"
          :class="[
            'review-header__badge inline-flex items-center h-6 px-2 py-1 rounded-full text-xs font-medium tracking-[-0.15px]',
            badge.classes,
          ]"
        >
          {{ badge.text }}
        </span>
      </div>
      <p
        v-if="subtitle"
        class="review-header__subtitle text-base text-muted-foreground tracking-[-0.31px]"
      >
        {{ subtitle }}
      </p>
    </div>

    <div v-if="showProgress" class="review-header__progress space-y-2">
      <div class="text-sm text-muted-foreground tracking-[-0.15px]">
        Крок {{ currentStep }} з {{ totalSteps }}
      </div>
      <div class="h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          class="h-full rounded-full bg-foreground transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <div v-if="displayInfo" class="review-header__info rounded-2xl bg-[#f3f3f5] px-6 py-6">
      <div class="flex items-start gap-3 mb-2">
        <!-- Warning icon: PO returned-from-CEO attention banner -->
        <svg
          v-if="displayInfo.iconVariant === 'warning'"
          class="size-6 shrink-0 text-[#C97D00]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <!-- Default check icon: status-driven info blocks -->
        <svg
          v-else
          class="size-6 shrink-0 text-foreground/80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="text-lg font-medium tracking-[-0.45px] text-foreground">{{ displayInfo.title }}</h3>
      </div>
      <p class="text-sm text-muted-foreground leading-5 pl-9">{{ displayInfo.description }}</p>
    </div>
  </header>
</template>
