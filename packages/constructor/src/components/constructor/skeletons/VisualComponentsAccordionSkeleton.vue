<script setup lang="ts">
import {
  UI_ACCORDION_HEADER_CLASS,
  UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS,
  UI_ACCORDION_HEADER_TITLE_GROUP_CLASS,
  UI_ACCORDION_ICON_SIZE_CLASS,
  UI_ACCORDION_ITEM_CLASS,
  UI_ACCORDION_LIST_CLASS,
} from '@/components/ui/uiAccordion'

/**
 * Loading placeholder for the Visual Components accordion list.
 *
 * Every number it shares with the real list — list pitch, section box, header
 * inset, header content height, icon size — is imported from `uiAccordion.ts`
 * rather than typed again. Before phase 12 the same eight values lived here as
 * a hand-written copy of `VisualComponentsView`, and the two drifted silently:
 * the only symptom is the list jumping when the real accordion replaces it,
 * which nobody sees in a diff.
 *
 * The two widths below are the only geometry of its own: they are the length
 * of the grey bars, which correspond to no real element. They are `rem` like
 * everything else so they follow the embed scale with the box around them.
 */
interface Props {
  /** Rows to draw (default 5 — Header / Banners / Thumbnails / Tabbar / Sidebar;
   *  `ct_theme` is filtered out in `VisualComponentsView`, so 5 matches). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 5 })

/** Name bar: about the width of the longest type name at the 16/24 title. */
const NAME_BAR_CLASS = 'w-[6.875rem]'
/** Badge bar: the width of a `Type A` chip. */
const BADGE_BAR_CLASS = 'w-[3.875rem]'
</script>

<template>
  <div
    :class="['visual-components-accordion-skeleton', UI_ACCORDION_LIST_CLASS]"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      :class="['visual-components-accordion-skeleton__row', UI_ACCORDION_ITEM_CLASS]"
    >
      <div :class="UI_ACCORDION_HEADER_CLASS">
        <div :class="UI_ACCORDION_HEADER_TITLE_GROUP_CLASS">
          <div
            :class="[
              UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS,
              NAME_BAR_CLASS,
              'rounded bg-muted animate-pulse',
            ]"
          />
          <div
            :class="[
              UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS,
              BADGE_BAR_CLASS,
              'rounded-full bg-muted animate-pulse',
            ]"
          />
        </div>
        <div :class="[UI_ACCORDION_ICON_SIZE_CLASS, 'rounded bg-muted animate-pulse']" />
      </div>
    </div>
  </div>
</template>
