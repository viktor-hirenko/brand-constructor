<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { UI_POPOVER_CLASS, UI_POPOVER_HEADER_CLASS } from '@/components/ui/uiListItem'

/**
 * Kit Popover — Figma `3446:5235`. Recipe lives in `uiListItem.ts`.
 *
 * Surface only: white, border `input/list/border`, radius 8, padding 4, plus
 * the kit's optional 32-tall Header. **Positioning stays at the call site on
 * purpose.** The three popovers in the wizard place themselves three different
 * ways for three real reasons — the date picker teleports to `<body>` and
 * measures the viewport to flip above the trigger, the GEO list is absolute
 * inside its own relative box, the brief-order menu hangs off a button — and
 * folding those into one component would mean re-deciding the escape from the
 * shell's `transform: scale`, which "Железные правила адаптива" puts out of
 * bounds for a вынос phase.
 *
 *   <UiPopover class="absolute top-full left-0 z-50 mt-1.5 w-full">
 *     <template #header>Популярні</template>
 *     <UiListItem …/>
 *   </UiPopover>
 */
interface UiPopoverProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiPopoverProps>(), { class: undefined })
</script>

<template>
  <div :class="[UI_POPOVER_CLASS, props.class]">
    <div v-if="$slots.header" :class="UI_POPOVER_HEADER_CLASS"><slot name="header" /></div>
    <slot />
  </div>
</template>
