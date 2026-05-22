<script setup lang="ts">
import type { StrokeIconProps } from './types'

const props = withDefaults(defineProps<StrokeIconProps>(), {
  strokeWidth: 1.33333,
})
</script>

<template>
  <svg
    :class="props.class ?? 'size-4 shrink-0'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="props.title ? 'img' : undefined"
    :aria-label="props.title"
    :aria-hidden="props.title ? undefined : true"
  >
    <path d="M3.33337 8H12.6667" />
    <path d="M8 3.3335V12.6668" />
  </svg>
</template>
