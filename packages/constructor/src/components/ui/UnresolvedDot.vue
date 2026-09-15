<script setup lang="ts">
/**
 * Unread-comment dot on a review section header — an alias for `UiStatusDot`
 * (DP-15258 phase 7), kept so the review tree does not get renamed.
 *
 * The colour moved from Tailwind's `bg-blue-500` `#3b82f6` to the kit's
 * `status indicator/info` `#3a5bc7` (`3761:1914`) — open question 3, decided by
 * the mockup.
 */
import UiStatusDot from '@/components/ui/UiStatusDot.vue'
</script>

<template>
  <UiStatusDot class="unresolved-dot" />
</template>
