<script setup lang="ts">
import { computed } from 'vue'
import {
  clampProgressPercent,
  resolveUiProgressBarClasses,
} from '@/components/ui/uiProgressBar'

/**
 * Kit progress bar — Figma `3889:2807` / `3889:2849`.
 *
 * `label` is optional: without it this is the bare bar (`3889:2807`), with it
 * the labelled variant (`3889:2849`). The wizard and the review shell both pass
 * a label; they used to draw two different bars.
 */
interface UiProgressBarProps {
  /** 0–100. Values outside the range are clamped, not trusted. */
  percent: number
  /** Line above the track, e.g. "Крок 3 з 8". Omit for the bare bar. */
  label?: string
}

const props = withDefaults(defineProps<UiProgressBarProps>(), {
  label: '',
})

const classes = resolveUiProgressBarClasses()
const percent = computed(() => clampProgressPercent(props.percent))
</script>

<template>
  <div :class="classes.root">
    <div v-if="label" :class="classes.label">{{ label }}</div>
    <div
      :class="classes.track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
      :aria-label="label || undefined"
    >
      <div :class="classes.fill" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>
