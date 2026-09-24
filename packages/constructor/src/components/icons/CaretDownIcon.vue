<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `CaretDown`, Regular weight — the kit's own chevron.
 *
 * Source: the accordion header's Chevron Icon `3839:12555` exports this exact
 * path at 16×16, and the designer's Icon mapping table (`5658:39246`) names it
 * outright: "Chevron down → CaretDown, Regular".
 *
 * One file, two boxes merged. `ChevronDownIcon.vue` used to sit beside this
 * one and was a different drawing — a 24-box stroked chevron at
 * `stroke-width: 2`, which at 16 rendered ~1.33 wide and read visibly heavier.
 * That difference is what QA caught on phase 12. Phase 23 then converted it to
 * this same Phosphor path on a 24 viewBox, which made the two files the same
 * glyph twice: 16.5 of 24 and 11 of 16 are both 68.75% of the box, so they
 * render identically at any size. The clean-up work deleted the duplicate and
 * pointed its two carriers — `LandingDraftCta` and `BriefOrderButton` — here.
 *
 * The open state reuses this glyph under `rotate-180`. The kit draws a
 * separate `CaretUp` there, but it is the vertical mirror of this path in the
 * same `#6F6F7D`, so the rotation is exact rather than approximate.
 */
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
      d="M13.3537 6.35375L8.35374 11.3538C8.30731 11.4002 8.25216 11.4371 8.19146 11.4623C8.13076 11.4874 8.0657 11.5004 7.99999 11.5004C7.93429 11.5004 7.86922 11.4874 7.80852 11.4623C7.74782 11.4371 7.69268 11.4002 7.64624 11.3538L2.64624 6.35375C2.55242 6.25993 2.49972 6.13269 2.49972 6C2.49972 5.86732 2.55242 5.74007 2.64624 5.64625C2.74006 5.55243 2.86731 5.49973 2.99999 5.49973C3.13268 5.49973 3.25992 5.55243 3.35374 5.64625L7.99999 10.2931L12.6462 5.64625C12.6927 5.5998 12.7478 5.56295 12.8085 5.53781C12.8692 5.51267 12.9343 5.49973 13 5.49973C13.0657 5.49973 13.1307 5.51267 13.1914 5.53781C13.2521 5.56295 13.3073 5.5998 13.3537 5.64625C13.4002 5.69271 13.437 5.74786 13.4622 5.80856C13.4873 5.86925 13.5003 5.93431 13.5003 6C13.5003 6.0657 13.4873 6.13076 13.4622 6.19145C13.437 6.25215 13.4002 6.3073 13.3537 6.35375Z"
      fill="currentColor"
    />
  </svg>
</template>
