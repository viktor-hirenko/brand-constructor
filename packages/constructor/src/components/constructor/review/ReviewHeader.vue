<script setup lang="ts">
import { computed } from 'vue'
import BrandBriefStatusBadge from '@/components/constructor/review/BrandBriefStatusBadge.vue'
import UiStepHeader from '@/components/ui/UiStepHeader.vue'
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
  <header class="review-header">
    <UiStepHeader
      :title="title"
      :description="subtitle"
      :current-step="showProgress ? currentStep : undefined"
      :total-steps="showProgress ? totalSteps : undefined"
      :progress-percent="showProgress ? progressPercent : undefined"
    >
      <template v-if="showStatusBadge" #badge>
        <BrandBriefStatusBadge class="review-header__badge shrink-0" :status="status" />
      </template>

      <!--
        The kit's Alert slot. `UiAlert` lands in phase 5; until then the review
        shell's own info block rides through the slot unchanged, so phase 3
        moves no pixel inside it.
      -->
      <template v-if="displayInfo" #alert>
        <div class="review-header__info rounded-[16px] border border-[#EDEDED] bg-white px-6 py-6">
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
      </template>
    </UiStepHeader>
  </header>
</template>
