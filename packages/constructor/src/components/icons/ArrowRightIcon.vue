<script setup lang="ts">
import type { StrokeIconProps } from './types'

const props = withDefaults(defineProps<StrokeIconProps>(), {
  strokeWidth: 2,
})
</script>

<template>
  <svg
    :class="props.class ?? 'size-4 shrink-0'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="props.title ? 'img' : undefined"
    :aria-label="props.title"
    :aria-hidden="props.title ? undefined : true"
  >
    <path d="M5 12H19" />
    <path d="M12 5l7 7-7 7" />
  </svg>
</template>
