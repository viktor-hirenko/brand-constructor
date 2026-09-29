<script setup lang="ts">
import { SIDEBAR_SCROLL_HINT_MESSAGE } from '@/constants/visualComponentPreviewMessages'

/**
 * Her tooltip `5382:33752` on the drawn step 7 `5382:33712` — DP-15450,
 * Interface Components 3. Measured off the node:
 *
 *   box      182 × 64: a 182 × 56 bubble plus a 16 × 8 arrow under its centre
 *   bubble   #2d2d39, radius 8, padding 12 — the colour has no kit variable
 *   text     `caption/m/regular` 12/16 weight 400, white, two lines at 158
 *   place    38 from the top of the preview panel, i.e. 6 below the top of its
 *            content, centred across the panel — which centres it over the phone
 *
 * The arrow is her own path, copied from the node's asset, not a rotated square.
 * The parent owns WHEN it shows; this draws it and nothing else, and never takes
 * the pointer — the wheel under it has to reach the list.
 */
</script>

<template>
  <div
    class="sidebar-scroll-hint pointer-events-none absolute left-1/2 top-1.5 z-40 flex w-[11.375rem] -translate-x-1/2 flex-col items-center"
    role="status"
  >
    <p class="w-full rounded-lg bg-[#2d2d39] p-3 text-xs leading-4 font-normal text-white">
      {{ SIDEBAR_SCROLL_HINT_MESSAGE }}
    </p>
    <svg
      class="block h-2 w-4 shrink-0"
      viewBox="0 0 16 8"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 0H0L6.58579 6.58579C7.36684 7.36684 8.63317 7.36684 9.41421 6.58579L16 0Z"
        fill="#2D2D39"
      />
    </svg>
  </div>
</template>
