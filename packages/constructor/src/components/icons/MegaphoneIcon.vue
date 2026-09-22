<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `Megaphone`, Regular weight — the kit's own glyph, node `3262:4491`.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "PR Packages | pr-package → Megaphone, Regular".
 *
 * The kit draws one filled path and no stroke at all. What stood here before
 * was our own 20-box filled megaphone, which is why the weight read
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
      d="M23.25 11.25C23.2488 10.0569 22.7743 8.91302 21.9306 8.06938C21.087 7.22573 19.9431 6.75123 18.75 6.74999H15.0187C14.7459 6.73405 9.99187 6.39936 5.46469 2.60249C5.24607 2.41888 4.97959 2.30148 4.69656 2.26406C4.41353 2.22665 4.12571 2.27079 3.86689 2.39129C3.60807 2.51179 3.38902 2.70364 3.23546 2.94432C3.0819 3.185 3.00022 3.4645 3 3.74999V18.75C3.00004 19.0356 3.0816 19.3152 3.23508 19.556C3.38857 19.7968 3.60761 19.9888 3.86646 20.1094C4.12532 20.23 4.41322 20.2743 4.69633 20.2369C4.97945 20.1995 5.24601 20.0821 5.46469 19.8984C9.00562 16.9284 12.6834 16.0772 14.25 15.8391V18.8128C14.2497 19.06 14.3105 19.3034 14.4269 19.5214C14.5434 19.7394 14.7119 19.9253 14.9175 20.0625L15.9487 20.7497C16.1481 20.8827 16.3764 20.9661 16.6145 20.9927C16.8527 21.0194 17.0938 20.9886 17.3176 20.903C17.5414 20.8173 17.7414 20.6793 17.901 20.5004C18.0605 20.3216 18.1748 20.1071 18.2344 19.875L19.3378 15.7162C20.4204 15.5722 21.4138 15.04 22.1334 14.2184C22.853 13.3969 23.2498 12.3421 23.25 11.25ZM4.5 18.7434V3.74999C8.51344 7.11655 12.6216 7.96874 14.25 8.17874V14.3175C12.6234 14.5312 8.51625 15.3815 4.5 18.7434ZM16.7812 19.4934V19.5037L15.75 18.8166V15.75H17.775L16.7812 19.4934ZM18.75 14.25H15.75V8.24999H18.75C19.5457 8.24999 20.3087 8.56606 20.8713 9.12867C21.4339 9.69128 21.75 10.4543 21.75 11.25C21.75 12.0456 21.4339 12.8087 20.8713 13.3713C20.3087 13.9339 19.5457 14.25 18.75 14.25Z"
      fill="currentColor"
    />
  </svg>
</template>
