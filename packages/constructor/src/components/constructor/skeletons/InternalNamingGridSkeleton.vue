<script setup lang="ts">
import {
  resolveUiNameCardClasses,
  UI_NAME_CARD_GRID_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
} from '@/components/ui/uiNameCard'

/**
 * Loading skeleton for `InternalNamingGrid`.
 *
 * It does not copy the card's geometry — it imports it. The grid track, the 64
 * box, the radius, the padding, the gap and the border all come from
 * `uiNameCard.ts`, which is the same file the real card reads, so the two
 * cannot drift apart. The one number that cannot travel as a shared class is
 * the name's 24 line box (a grey bar has no line box); it travels as
 * `UI_NAME_CARD_NAME_HEIGHT_CLASS` and `uiNameCard.test.ts` pins the pair.
 *
 * The tile version of this file kept eight hand-typed copies of those numbers
 * and the drift was invisible in review — it showed up as the list jumping when
 * the real names arrived. Same lesson as the accordion skeleton in phase 12.
 */
interface Props {
  /** Number of skeleton rows (default 6 = three rows of two). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })

/**
 * The read-only card, asked for by name rather than assembled from parts:
 * phase 16 moved the height out of the base class (the same card is 64 here and
 * 76 on step 3), and an assembled skeleton would have silently lost it.
 */
const cardClass = resolveUiNameCardClasses({ readonly: true })
</script>

<template>
  <div
    :class="['internal-naming-grid-skeleton', UI_NAME_CARD_GRID_CLASS]"
    aria-hidden="true"
  >
    <div v-for="i in count" :key="i" :class="['internal-naming-grid-skeleton__card', cardClass]">
      <!-- The checkbox: 32 circle, same box as the real one. -->
      <div class="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
      <!-- The name: one 24 line box, the height the kit gives the text frame. -->
      <div :class="UI_NAME_CARD_TEXT_CLASS">
        <div
          :class="['w-3/5 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]"
        />
      </div>
    </div>
  </div>
</template>
