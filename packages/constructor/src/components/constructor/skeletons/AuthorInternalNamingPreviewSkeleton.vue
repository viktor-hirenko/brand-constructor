<script setup lang="ts">
import {
  resolveUiNameCardClasses,
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
} from '@/components/ui/uiNameCard'

/**
 * Loading skeleton for `AuthorInternalNamingPreview`.
 *
 * Same rule as `InternalNamingGridSkeleton`: the geometry is imported from
 * `uiNameCard.ts` rather than copied, so the grey card and the real one cannot
 * drift apart. It used to hold its own copy of the 128-tall tile.
 *
 * The card is the read-only one, and it asks the resolver for its classes
 * rather than assembling them from parts — phase 16 moved the height out of the
 * base class (the same card is 64 here and 76 on step 3) and an assembled
 * skeleton would have silently lost it.
 */
const cardClass = resolveUiNameCardClasses({ readonly: true })
</script>

<template>
  <div
    class="author-internal-naming-preview-skeleton flex flex-col gap-3"
    aria-hidden="true"
  >
    <div class="h-6 w-35 rounded bg-muted animate-pulse" />
    <div
      :class="['author-internal-naming-preview-skeleton__grid', UI_NAME_CARD_GRID_CLASS]"
    >
      <div :class="cardClass">
        <div class="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
        <div :class="UI_NAME_CARD_TEXT_CLASS">
          <div
            :class="['w-3/5 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
