<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `Check`, Regular weight — the kit's own glyph, node `3262:993`.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "Check | check → Check, Regular".
 *
 * The kit draws one filled path and no stroke at all. What stood here before
 * was a 16-box round-capped tick — close by name, a different shape in fact, which is why the weight read
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
      d="M21.5306 7.28062L9.53061 19.2806C9.46096 19.3503 9.37824 19.4057 9.2872 19.4434C9.19615 19.4812 9.09855 19.5006 8.99999 19.5006C8.90143 19.5006 8.80383 19.4812 8.71278 19.4434C8.62174 19.4057 8.53902 19.3503 8.46936 19.2806L3.21936 14.0306C3.07863 13.8899 2.99957 13.699 2.99957 13.5C2.99957 13.301 3.07863 13.1101 3.21936 12.9694C3.3601 12.8286 3.55097 12.7496 3.74999 12.7496C3.94901 12.7496 4.13988 12.8286 4.28061 12.9694L8.99999 17.6897L20.4694 6.21936C20.6101 6.07863 20.801 5.99957 21 5.99957C21.199 5.99957 21.3899 6.07863 21.5306 6.21936C21.6713 6.36009 21.7504 6.55097 21.7504 6.74999C21.7504 6.94901 21.6713 7.13988 21.5306 7.28062Z"
      fill="currentColor"
    />
  </svg>
</template>
