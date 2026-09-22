<script setup lang="ts">
import {
  resolveUiNameCardClasses,
  UI_NAME_CARD_BADGE_SKELETON_CLASS,
  UI_NAME_CARD_DOMAIN_HEIGHT_CLASS,
  UI_NAME_CARD_LIST_CLASS,
  UI_NAME_CARD_META_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_PRICE_HEIGHT_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
} from '@/components/ui/uiNameCard'

/**
 * Loading skeleton for `ExternalNamingGrid`.
 *
 * It does not copy the card's geometry — it imports it. The column, the 76 box,
 * the radius, the padding, the gaps, the border and the 140 meta block all come
 * from `uiNameCard.ts`, the same file the real card reads, so the two cannot
 * drift apart on External Naming screens (PO wizard / CEO reselect / PO edit /
 * revision).
 *
 * The numbers that cannot travel as a shared class are the three line boxes —
 * a grey bar has no line box — so they travel as their own constants and
 * `uiNameCard.test.ts` pins each of them to the text class it stands in for.
 * The tile version of this file kept those numbers by hand and the drift showed
 * up as the list jumping when the real namings arrived.
 */
interface Props {
  /** Number of skeleton rows (default 6). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })

const cardClass = resolveUiNameCardClasses({ readonly: true, detailed: true })
</script>

<template>
  <div :class="['external-naming-grid-skeleton', UI_NAME_CARD_LIST_CLASS]" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      :class="['external-naming-grid-skeleton__card', cardClass]"
    >
      <!-- The checkbox: 32 circle, same box as the real one. -->
      <div class="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
      <div :class="UI_NAME_CARD_TEXT_CLASS">
        <!-- The name: one 24 line box. Under it the domain's 16. -->
        <div :class="['w-3/5 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]" />
        <div :class="['w-2/5 rounded bg-muted animate-pulse', UI_NAME_CARD_DOMAIN_HEIGHT_CLASS]" />
      </div>
      <div :class="UI_NAME_CARD_META_CLASS">
        <div
          :class="['min-w-0 flex-1 rounded bg-muted animate-pulse', UI_NAME_CARD_PRICE_HEIGHT_CLASS]"
        />
        <!-- Badge placeholder: the kit instance is 68×24, radius 1000. -->
        <div :class="['shrink-0 bg-muted animate-pulse', UI_NAME_CARD_BADGE_SKELETON_CLASS]" />
      </div>
    </div>
  </div>
</template>
