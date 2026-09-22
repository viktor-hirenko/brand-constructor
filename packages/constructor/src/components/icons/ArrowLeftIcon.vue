<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `ArrowLeft`, Regular weight — the kit's own glyph, node `3262:988`.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "Arrow left | arrow-left → ArrowLeft, Regular".
 *
 * The kit draws one filled path and no stroke at all. What stood here before
 * was a 24-box stroked arrow at stroke-width 2, which is why the weight read
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
      d="M21 12C21 12.1989 20.921 12.3897 20.7803 12.5304C20.6397 12.671 20.4489 12.75 20.25 12.75H5.56029L11.0306 18.2194C11.1003 18.2891 11.1556 18.3718 11.1933 18.4628C11.231 18.5539 11.2504 18.6515 11.2504 18.75C11.2504 18.8486 11.231 18.9461 11.1933 19.0372C11.1556 19.1282 11.1003 19.211 11.0306 19.2806C10.9609 19.3503 10.8782 19.4056 10.7872 19.4433C10.6961 19.481 10.5985 19.5004 10.5 19.5004C10.4014 19.5004 10.3039 19.481 10.2128 19.4433C10.1218 19.4056 10.039 19.3503 9.96935 19.2806L3.21935 12.5306C3.14962 12.461 3.0943 12.3783 3.05656 12.2872C3.01882 12.1962 2.99939 12.0986 2.99939 12C2.99939 11.9015 3.01882 11.8039 3.05656 11.7128C3.0943 11.6218 3.14962 11.539 3.21935 11.4694L9.96935 4.7194C10.1101 4.57866 10.301 4.4996 10.5 4.4996C10.699 4.4996 10.8899 4.57866 11.0306 4.7194C11.1713 4.86013 11.2504 5.051 11.2504 5.25002C11.2504 5.44904 11.1713 5.63991 11.0306 5.78065L5.56029 11.25H20.25C20.4489 11.25 20.6397 11.329 20.7803 11.4697C20.921 11.6103 21 11.8011 21 12Z"
      fill="currentColor"
    />
  </svg>
</template>
