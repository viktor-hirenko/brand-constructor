<script setup lang="ts">
import {
  resolveUiNameCardClasses,
  UI_NAME_CARD_DOMAIN_HEIGHT_CLASS,
  UI_NAME_CARD_LIST_CLASS,
  UI_NAME_CARD_META_CLASS,
  UI_NAME_CARD_NAME_HEIGHT_CLASS,
  UI_NAME_CARD_PRICE_HEIGHT_CLASS,
  UI_NAME_CARD_TEXT_CLASS,
} from '@/components/ui/uiNameCard'

/**
 * Loading skeleton for `AuthorNamingsRow`.
 *
 * Label plus the same one-column list of kit name cards the block itself
 * renders, with the geometry imported rather than copied — see
 * `ExternalNamingGridSkeleton` for why. The customer's picks carry no
 * availability, so there is no badge placeholder here either.
 */
interface Props {
  /** Number of skeleton rows (default 3). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 3 })

const cardClass = resolveUiNameCardClasses({ readonly: true, detailed: true })
</script>

<template>
  <div class="author-namings-row-skeleton flex flex-col gap-3" aria-hidden="true">
    <!-- The label's own 24 line box. -->
    <div :class="['w-35 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]" />
    <div :class="['author-namings-row-skeleton__grid', UI_NAME_CARD_LIST_CLASS]">
      <div
        v-for="i in count"
        :key="i"
        :class="['author-namings-row-skeleton__card', cardClass]"
      >
        <div class="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
        <div :class="UI_NAME_CARD_TEXT_CLASS">
          <div :class="['w-3/5 rounded bg-muted animate-pulse', UI_NAME_CARD_NAME_HEIGHT_CLASS]" />
          <div
            :class="['w-2/5 rounded bg-muted animate-pulse', UI_NAME_CARD_DOMAIN_HEIGHT_CLASS]"
          />
        </div>
        <div :class="UI_NAME_CARD_META_CLASS">
          <div
            :class="[
              'min-w-0 flex-1 rounded bg-muted animate-pulse',
              UI_NAME_CARD_PRICE_HEIGHT_CLASS,
            ]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
