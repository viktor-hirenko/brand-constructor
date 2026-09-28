<script setup lang="ts">
import {
  MARKETING_PACKAGE_CARD_BODY_CLASS,
  MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS,
  MARKETING_PACKAGE_CARD_CLASS,
  MARKETING_PACKAGE_CARD_CONTENT_CLASS,
  MARKETING_PACKAGE_CARD_HEADER_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_CLASS,
  MARKETING_PACKAGE_CARD_TILE_CLASS,
  MARKETING_PACKAGE_GRID_CLASS,
} from '@/constants/marketingPackageCard'

/**
 * Pixel-matched skeleton for the step 5 grid.
 *
 * It borrows the very classes the loaded card uses — grid, card, header, body,
 * tile, both inner panels — instead of restating them, so the two cannot drift
 * apart and swapping one for the other causes no layout shift. That drift is
 * exactly what happened before: this file carried its own copy of the card's
 * geometry, and with it two of the four boxes painted the half-alpha `#ececf0`
 * that divergences row 109 was opened for — so half of that row lived here,
 * not in the screen anyone was looking at.
 *
 * Only the greyed placeholder bars are local, and they are the one thing the
 * card has no opinion about.
 */
interface Props {
  /** Number of skeleton tiles (default 3 — one per visible column on xl). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 3 })

/** A pulsing bar standing in for a line of text. */
const BAR_CLASS = 'rounded bg-muted animate-pulse'
</script>

<template>
  <div
    class="marketing-package-grid-skeleton"
    :class="MARKETING_PACKAGE_GRID_CLASS"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="marketing-package-grid-skeleton__card"
      :class="[MARKETING_PACKAGE_CARD_CLASS, MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS]"
    >
      <div :class="MARKETING_PACKAGE_CARD_CONTENT_CLASS">
        <!-- Header: 32 tile + title -->
        <div :class="MARKETING_PACKAGE_CARD_HEADER_CLASS">
          <div :class="MARKETING_PACKAGE_CARD_TILE_CLASS">
            <div class="size-4 animate-pulse rounded bg-muted" />
          </div>
          <div class="h-4 w-1/2" :class="BAR_CLASS" />
        </div>

        <div :class="MARKETING_PACKAGE_CARD_BODY_CLASS">
          <!-- Timeline box -->
          <div :class="MARKETING_PACKAGE_CARD_PANEL_CLASS">
            <div class="h-4 w-1/3" :class="BAR_CLASS" />
            <div class="h-4 w-2/3" :class="BAR_CLASS" />
          </div>

          <!-- Components box -->
          <div :class="MARKETING_PACKAGE_CARD_PANEL_CLASS">
            <div class="h-4 w-1/4" :class="BAR_CLASS" />
            <div v-for="j in 4" :key="j" class="h-4 w-3/4" :class="BAR_CLASS" />
          </div>
        </div>
      </div>

      <!-- The Secondary M-40 button below the content -->
      <div class="h-10 w-full rounded-lg border border-solid border-ink-300 bg-muted/40 animate-pulse" />
    </div>
  </div>
</template>
