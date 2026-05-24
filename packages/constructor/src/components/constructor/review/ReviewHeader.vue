<script setup lang="ts">
import { computed } from 'vue'
import BrandBriefStatusBadge from '@/components/constructor/review/BrandBriefStatusBadge.vue'
import CheckBadgeIcon from '@/components/icons/CheckBadgeIcon.vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'

interface InfoOverride {
  title: string
  description: string
  /**
   * Override the info-block icon. Default `'check'` (circled check used for
   * status-based info blocks like "Бриф готовий!" / "Бриф на розгляді").
   * Use `'warning'` for return / revision attention banners (filled circle icon).
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

const showStatusBadge = computed(
  () =>
    props.status === 'submitted' ||
    props.status === 'needs_revision' ||
    props.status === 'approved'
)

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
        iconVariant: 'warning' as const,
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
      <div class="review-header__title-row flex items-center gap-3 flex-wrap">
        <h1 class="review-header__title text-3xl font-medium tracking-[-0.6px] text-foreground">{{ title }}</h1>
        <BrandBriefStatusBadge
          v-if="showStatusBadge"
          class="review-header__badge shrink-0"
          :status="status"
        />
      </div>
      <p
        v-if="subtitle"
        class="review-header__subtitle text-base text-muted-foreground tracking-[-0.31px]"
      >
        {{ subtitle }}
      </p>
    </div>

    <div v-if="showProgress" class="review-header__progress space-y-2">
      <div class="review-header__progress-label text-sm text-muted-foreground tracking-[-0.15px]">
        Крок {{ currentStep }} з {{ totalSteps }}
      </div>
      <div class="review-header__progress-track h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          class="review-header__progress-bar h-full rounded-full bg-foreground transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <div
      v-if="displayInfo"
      class="review-header__info rounded-[16px] border border-[#EDEDED] bg-white px-6 py-6"
    >
      <div class="review-header__info-header flex items-start gap-3 mb-2">
        <InfoCircleFilledIcon
          v-if="displayInfo.iconVariant === 'warning'"
          class="review-header__info-icon review-header__info-icon--warning size-6 shrink-0 text-[#DCA100]"
        />
        <CheckBadgeIcon
          v-else
          class="review-header__info-icon review-header__info-icon--check size-6 shrink-0 text-foreground/80"
        />
        <h3 class="review-header__info-title text-lg font-medium tracking-[-0.45px] text-foreground">
          {{ displayInfo.title }}
        </h3>
      </div>
      <p class="review-header__info-description text-sm text-muted-foreground leading-5 pl-9">
        {{ displayInfo.description }}
      </p>
    </div>
  </header>
</template>
