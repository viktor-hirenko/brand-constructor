<script setup lang="ts">
import { computed } from 'vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import {
  formatWizardStepBadge,
  resolveUiWizardHeaderClasses,
  UI_WIZARD_HEADER_TITLE,
  wizardProgressPercent,
} from '@/components/ui/uiWizardHeader'

/**
 * Kit wizard header — Figma `5382:30951`, 1230×73.
 *
 * Sits above the two columns on every wizard screen: the kit draws it on all 29
 * frames of the refactor canvas `5382:36911` and on all four breakpoints of
 * `5395:118197`. It carries the title, the step counter and the progress rule
 * that used to live, at the wrong size and in the wrong place, inside
 * `UiStepHeader`.
 *
 * `currentStep` / `totalSteps` drive both the badge and the rule. Omit them and
 * the header renders without either — that is the review gate and any future
 * screen that is not a numbered step.
 *
 * `CloseIcon` is Phosphor `X` Regular, which is the glyph the symbol exports;
 * the mapping table `5658:39246` names it outright ("Close | close → X").
 */
interface UiWizardHeaderProps {
  /** Overrides the kit's own "Brand Creation" — for a screen that names itself. */
  title?: string
  /** Current step. With `totalSteps`, shows the badge and fills the rule. */
  currentStep?: number
  /** Total steps. */
  totalSteps?: number
  /** Hides the close control where there is nothing to close to. */
  showClose?: boolean
}

const props = withDefaults(defineProps<UiWizardHeaderProps>(), {
  title: UI_WIZARD_HEADER_TITLE,
  currentStep: undefined,
  totalSteps: undefined,
  showClose: true,
})

const emit = defineEmits<{ close: [] }>()

const classes = resolveUiWizardHeaderClasses()

const hasSteps = computed(() => props.currentStep != null && props.totalSteps != null)

const badgeLabel = computed(() =>
  hasSteps.value ? formatWizardStepBadge(props.currentStep as number, props.totalSteps as number) : ''
)

const progressPercent = computed(() =>
  hasSteps.value ? wizardProgressPercent(props.currentStep as number, props.totalSteps as number) : 0
)
</script>

<template>
  <header :class="classes.root">
    <div :class="classes.content">
      <div :class="classes.titleRow">
        <h1 :class="classes.title">{{ title }}</h1>
        <UiBadge v-if="hasSteps" tone="neutral" :label="badgeLabel" />
      </div>

      <button
        v-if="showClose"
        type="button"
        :class="classes.close"
        aria-label="Закрити"
        title="Закрити"
        @click="emit('close')"
      >
        <CloseIcon :class="classes.closeIcon" />
      </button>
    </div>

    <div
      v-if="hasSteps"
      :class="classes.progressTrack"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progressPercent)"
      :aria-label="`Крок ${currentStep} з ${totalSteps}`"
    >
      <div :class="classes.progressFill" :style="{ width: `${progressPercent}%` }" />
    </div>
  </header>
</template>
