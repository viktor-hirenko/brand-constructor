<script setup lang="ts">
import { EDIT_FLOW_AUTHOR_PICK_CARD_CLASS } from '@/constants/editFlowLayout'
/**
 * Pixel-matched skeleton for `AuthorPickPreview`.
 *
 * Mirrors the final layout (label row + 162×162 rounded image) so swapping
 * between skeleton and content does not cause a CLS / layout shift on the
 * CEO reselect concept page.
 */
</script>

<template>
  <div class="author-pick-preview-skeleton flex flex-col gap-3" aria-hidden="true">
    <div class="h-6 w-[120px] rounded bg-muted animate-pulse" />
    <div :class="['aspect-square rounded-2xl bg-muted animate-pulse shrink-0', EDIT_FLOW_AUTHOR_PICK_CARD_CLASS]" />
  </div>
</template>
