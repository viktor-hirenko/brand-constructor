<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import UiDivider from '@/components/ui/UiDivider.vue'
import {
  UI_SECTION_CARD_BODY_CLASS,
  UI_SECTION_CARD_CONTENT_CLASS,
  UI_SECTION_CARD_HEADER_CLASS,
  UI_SECTION_CARD_TITLE_CLASS,
  UI_SECTION_CARD_TITLE_GROUP_CLASS,
  resolveUiSectionCardClasses,
} from '@/components/ui/uiSectionCard'

/**
 * Kit Section card — Figma `3761:2273`. Recipe lives in `uiSectionCard.ts`.
 *
 *   <UiSectionCard title="Brand Basics">
 *     <template #badge><SectionStatusBadge variant="attention" /></template>
 *     <template #action><UiButton variant="ghost" size="M">Редагувати</UiButton></template>
 *     <UiProperty label="Географія" :value="geo">…</UiProperty>
 *     <template #comment><SectionCommentBlock … /></template>
 *   </UiSectionCard>
 *
 * Four slots because the kit has four: the Title frame carries Badge and
 * Status indicator side by side (both optional, both `hidden` on the drawn
 * Final review), the Header carries one Action, and the Content carries a
 * property list above a comment section.
 *
 * The divider is `UiDivider` rather than a border on the header: that is what
 * the symbol draws (instance `3760:2361`, a rule of its own at y = 56) and it
 * keeps the line on the same component every other separator in the wizard
 * already uses.
 */
interface UiSectionCardProps {
  title: string
  /** Ours, not the kit's — the amber rim review puts on a section that still needs a comment. */
  highlighted?: boolean
  /** Lets the title truncate instead of wrapping when a badge shares the row. */
  titleTruncates?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiSectionCardProps>(), {
  highlighted: false,
  titleTruncates: false,
  class: undefined,
})

const cardClass = computed(() => resolveUiSectionCardClasses({ highlighted: props.highlighted }))
</script>

<template>
  <section :class="[cardClass, props.class]">
    <header :class="UI_SECTION_CARD_HEADER_CLASS">
      <div :class="[UI_SECTION_CARD_TITLE_GROUP_CLASS, titleTruncates ? 'flex-nowrap' : 'flex-wrap']">
        <h3 :class="[UI_SECTION_CARD_TITLE_CLASS, titleTruncates ? 'min-w-0 truncate' : '']">
          {{ title }}
        </h3>
        <slot name="badge" />
      </div>
      <slot name="action" />
    </header>

    <!-- Kit divider is 0 tall and draws over the header's last row. -->
    <UiDivider class="relative -mt-px" />

    <div :class="UI_SECTION_CARD_BODY_CLASS">
      <div :class="UI_SECTION_CARD_CONTENT_CLASS">
        <slot />
      </div>
      <slot name="comment" />
    </div>
  </section>
</template>
