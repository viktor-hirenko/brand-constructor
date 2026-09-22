<script setup lang="ts">
import {
  UI_NAME_CARD_BASE_CLASS,
  UI_NAME_CARD_DEFAULT_CLASS,
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
} from '@/components/ui/uiNameCard'

/**
 * Loading skeleton for `AuthorInternalNamingPreview`.
 *
 * Same rule as `InternalNamingGridSkeleton`: the geometry is imported from
 * `uiNameCard.ts` rather than copied, so the grey card and the real one cannot
 * drift apart. It used to hold its own copy of the 128-tall tile.
 */
</script>

<template>
  <div
    class="author-internal-naming-preview-skeleton flex flex-col gap-3"
    aria-hidden="true"
  >
    <div class="h-6 w-[8.75rem] rounded bg-muted animate-pulse" />
    <div
      :class="['author-internal-naming-preview-skeleton__grid', UI_NAME_CARD_GRID_CLASS]"
    >
      <div :class="[UI_NAME_CARD_BASE_CLASS, UI_NAME_CARD_DEFAULT_CLASS]">
        <div class="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
        <div
          :class="['w-3/5 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]"
        />
      </div>
    </div>
  </div>
</template>
