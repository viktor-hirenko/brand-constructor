<script setup lang="ts">
import type { IconProps } from './types'

const props = defineProps<IconProps>()
</script>

<template>
  <svg
    :class="props.class ?? 'size-4 shrink-0'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="none"
    :role="props.title ? 'img' : undefined"
    :aria-label="props.title"
    :aria-hidden="props.title ? undefined : true"
  >
    <path
      d="M12.1951 4.19575C12.4554 3.9354 12.8777 3.9354 13.138 4.19575C13.3982 4.45607 13.3982 4.87762 13.138 5.13794L6.47163 11.8051C6.21132 12.0654 5.78902 12.0653 5.52866 11.8051L2.86225 9.13794C2.6019 8.87759 2.6019 8.4561 2.86225 8.19575C3.1226 7.9354 3.54409 7.9354 3.80444 8.19575L5.99975 10.3903L12.1951 4.19575Z"
      fill="currentColor"
    />
  </svg>
</template>
