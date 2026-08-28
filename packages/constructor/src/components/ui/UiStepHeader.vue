<script setup lang="ts">
import { computed, useSlots } from 'vue'
import UiProgressBar from '@/components/ui/UiProgressBar.vue'
import { formatStepLabel } from '@/components/ui/uiProgressBar'
import { resolveUiStepHeaderClasses } from '@/components/ui/uiStepHeader'

/**
 * Kit step header — Figma `4463:9758` → `3984:8226`.
 *
 * Title + optional badge, description, optional progress, optional alert. One
 * component for all three shells: the wizard (`BriefShellView`), the edit /
 * reselect flows (`EditFlowStepShell`) and the review shell (`ReviewHeader`),
 * which each wrote their own version of the same block before DP-15258 phase 3.
 *
 * The progress row appears only when all three of `currentStep`, `totalSteps`
 * and `progressPercent` are given — the review shell shows it for the PO draft
 * and hides it for everyone else.
 *
 * The `alert` slot is the kit's Alert instance. Phase 3 only opens the slot;
 * `UiAlert` itself arrives in phase 5, so the review shell still passes its own
 * info block through untouched.
 */
interface UiStepHeaderProps {
  title: string
  description?: string
  /** Current step for the progress label. Needs `totalSteps` + `progressPercent`. */
  currentStep?: number
  /** Total steps for the progress label. */
  totalSteps?: number
  /** 0–100. Together with the two above, shows the progress row. */
  progressPercent?: number
}

const props = withDefaults(defineProps<UiStepHeaderProps>(), {
  description: '',
  currentStep: undefined,
  totalSteps: undefined,
  progressPercent: undefined,
})

const slots = useSlots()
const classes = resolveUiStepHeaderClasses()

const showProgress = computed(
  () =>
    props.progressPercent != null && props.currentStep != null && props.totalSteps != null
)

const progressLabel = computed(() =>
  props.currentStep != null && props.totalSteps != null
    ? formatStepLabel(props.currentStep, props.totalSteps)
    : ''
)
</script>

<template>
  <div :class="classes.root">
    <div :class="classes.text">
      <div :class="classes.titleRow">
        <h1 :class="classes.title">{{ title }}</h1>
        <slot name="badge" />
      </div>
      <p v-if="description" :class="classes.description">{{ description }}</p>
    </div>

    <UiProgressBar
      v-if="showProgress"
      class="ui-step-header__progress"
      :percent="progressPercent ?? 0"
      :label="progressLabel"
    />

    <div v-if="slots.alert" class="ui-step-header__alert">
      <slot name="alert" />
    </div>
  </div>
</template>
