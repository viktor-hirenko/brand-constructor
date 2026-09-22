<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `PencilSimple`, Regular weight — the kit's own glyph, node `3262:4181`.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "Редагувати | pen → PencilSimple, Regular".
 *
 * The kit draws one filled path and no stroke at all. What stood here before
 * was a 24-box hollow stroked pencil at stroke-width 2, which is why the weight read
 * differently at every size.
 *
 * Size and colour are decided by the component that shows this icon, never
 * here — see `uiProperty.ts`, `uiButton.ts`, `uiIconButton.ts`, `uiLink.ts`.
 */
const props = defineProps<IconProps>()
</script>

<template>
  <svg
    :class="props.class ?? 'size-4 shrink-0'"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    :role="props.title ? 'img' : undefined"
    :aria-label="props.title"
    :aria-hidden="props.title ? undefined : true"
  >
    <path
      d="M21.3103 6.87845L17.1216 2.68876C16.9823 2.54943 16.8169 2.43892 16.6349 2.36351C16.4529 2.28811 16.2578 2.2493 16.0608 2.2493C15.8638 2.2493 15.6687 2.28811 15.4867 2.36351C15.3047 2.43892 15.1393 2.54943 15 2.68876L3.4397 14.25C3.2998 14.3888 3.18889 14.554 3.11341 14.736C3.03792 14.918 2.99938 15.1133 3.00001 15.3103V19.5C3.00001 19.8978 3.15804 20.2794 3.43935 20.5607C3.72065 20.842 4.10218 21 4.50001 21H8.6897C8.88675 21.0006 9.08196 20.9621 9.26399 20.8866C9.44602 20.8111 9.61122 20.7002 9.75001 20.5603L21.3103 9.00001C21.4496 8.86072 21.5602 8.69534 21.6356 8.51333C21.711 8.33132 21.7498 8.13624 21.7498 7.93923C21.7498 7.74222 21.711 7.54713 21.6356 7.36512C21.5602 7.18311 21.4496 7.01774 21.3103 6.87845ZM8.6897 19.5H4.50001V15.3103L12.75 7.06032L16.9397 11.25L8.6897 19.5ZM18 10.1888L13.8103 6.00001L16.0603 3.75001L20.25 7.93876L18 10.1888Z"
      fill="currentColor"
    />
  </svg>
</template>
