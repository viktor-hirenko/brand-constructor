<script setup lang="ts">
import type { IconProps } from './types'

/**
 * Phosphor `ShieldCheck`, Regular weight — the kit's own glyph, node `5658:38636`.
 *
 * Source: icon set `3261:907`, exported at 24x24. The designer's Icon mapping
 * table (`5658:39246`) names it outright: "Trust Focus | → ShieldCheck, Regular".
 *
 * New file. The slot it fills — the level badge of PR package #1 on step 5
 * — carried `ZapIcon`, a bolt we drew ourselves; the table assigns the glyph by
 * the package NAME, which is why phase 23 missed it looking for file names.
 *
 * The kit draws one filled path and no stroke at all.
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
      d="M19.5 3.75H4.5C4.10218 3.75 3.72064 3.90804 3.43934 4.18934C3.15804 4.47064 3 4.85218 3 5.25V10.5C3 15.4425 5.3925 18.4378 7.39969 20.0803C9.56156 21.8484 11.7122 22.4484 11.8059 22.4738C11.9348 22.5088 12.0708 22.5088 12.1997 22.4738C12.2934 22.4484 14.4413 21.8484 16.6059 20.0803C18.6075 18.4378 21 15.4425 21 10.5V5.25C21 4.85218 20.842 4.47064 20.5607 4.18934C20.2794 3.90804 19.8978 3.75 19.5 3.75ZM19.5 10.5C19.5 13.9753 18.2194 16.7962 15.6937 18.8831C14.5943 19.7885 13.344 20.493 12 20.9644C10.6736 20.5012 9.4387 19.8092 8.35125 18.9197C5.79563 16.8291 4.5 13.9969 4.5 10.5V5.25H19.5V10.5ZM7.71937 13.2806C7.57864 13.1399 7.49958 12.949 7.49958 12.75C7.49958 12.551 7.57864 12.3601 7.71937 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44902 11.9996 8.63989 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.2891 9.14969 15.3718 9.09442 15.4628 9.0567C15.5539 9.01899 15.6515 8.99958 15.75 8.99958C15.8485 8.99958 15.9461 9.01899 16.0372 9.0567C16.1282 9.09442 16.2109 9.14969 16.2806 9.21937C16.3503 9.28906 16.4056 9.37178 16.4433 9.46283C16.481 9.55387 16.5004 9.65145 16.5004 9.75C16.5004 9.84855 16.481 9.94613 16.4433 10.0372C16.4056 10.1282 16.3503 10.2109 16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1217 15.6557 10.039 15.6004 9.96937 15.5306L7.71937 13.2806Z"
      fill="currentColor"
    />
  </svg>
</template>
