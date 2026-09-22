<script setup lang="ts">
/**
 * Kit Segmented control — Figma `3706:6076`, brought to the kit's four segment
 * states in DP-15258 phase 17. Geometry and colours live in
 * `ui/segmentedControl.ts`.
 *
 * Four screens show it, all with the same two theme options: step 2, the CEO
 * alternative flow, the revision flow and the draft edit flow.
 */
import { computed } from 'vue'
import {
  resolveSegmentedControlClasses,
  resolveSegmentState,
} from '@/components/ui/segmentedControl'

interface Option {
  value: string
  label: string
  /** Kit State = Disabled — greyed label, no plate, no click. */
  disabled?: boolean
}

interface SegmentedControlProps {
  options: Option[]
  modelValue: string
  /** Accessible name for the control group */
  ariaLabel?: string
  /** Disables every segment at once. */
  disabled?: boolean
}

const props = withDefaults(defineProps<SegmentedControlProps>(), {
  ariaLabel: undefined,
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const classes = computed(() => resolveSegmentedControlClasses())

function isDisabled(option: Option): boolean {
  return props.disabled || option.disabled === true
}

function select(option: Option) {
  if (isDisabled(option)) return
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div :class="classes.root" role="group" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :disabled="isDisabled(option)"
      :aria-pressed="modelValue === option.value"
      :class="
        classes.segment(
          resolveSegmentState({
            selected: modelValue === option.value,
            disabled: isDisabled(option),
          })
        )
      "
      @click="select(option)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
