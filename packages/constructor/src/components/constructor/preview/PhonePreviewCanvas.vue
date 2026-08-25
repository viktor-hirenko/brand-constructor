<script setup lang="ts">
/**
 * The whole phone: chassis plus a screen rendered as a real screen instead of
 * stacked absolute images. The header slot sticks to the top of the content
 * area, the tabbar slot to the bottom, and whatever sits between them scrolls.
 * The overlay slot covers the content area — that is where the sidebar goes.
 *
 * Painting order, bottom to top: chassis image → content. The chassis sits
 * underneath because its screen aperture is wider than the canvas on every
 * side, so the frame is never in a slice's way (see `PREVIEW_CHASSIS`).
 *
 * The canvas is laid out in design px of the 360×782.69 Figma frame and scaled
 * by one multiplier (see `resolveCanvasUnitRem`), so slice geometry never has to
 * be recomputed per host.
 */

import { computed } from 'vue'
import {
  PREVIEW_CANVAS,
  PREVIEW_CHASSIS,
  PREVIEW_PHONE_BOX,
  resolveCanvasUnitRem,
} from '@/constants/visualPreviewLayout'

interface Props {
  /** Rendered phone width in rem. Defaults to the step 7 size from Figma. */
  boxWidthRem?: number
  /** Rendered phone height in rem. Defaults to the step 7 size from Figma. */
  boxHeightRem?: number
}

const props = withDefaults(defineProps<Props>(), {
  boxWidthRem: PREVIEW_PHONE_BOX.widthRem,
  boxHeightRem: PREVIEW_PHONE_BOX.heightRem,
})

/**
 * The overlay slot gets the multiplier because the sidebar is the one piece of
 * content whose geometry is not "full width, height from the file": its pinned
 * strips are measured in design px and have to be scaled like the canvas itself.
 */
defineSlots<{
  top?: () => unknown
  body?: () => unknown
  bottom?: () => unknown
  overlay?: (props: { unitRem: number }) => unknown
}>()

const unitRem = computed(() => resolveCanvasUnitRem(props.boxWidthRem, props.boxHeightRem))

function toRem(designPx: number): string {
  return `${designPx * unitRem.value}rem`
}

const canvasStyle = computed(() => ({
  width: toRem(PREVIEW_CANVAS.widthPx),
  height: toRem(PREVIEW_CANVAS.heightPx),
}))

const contentStyle = computed(() => ({
  top: toRem(PREVIEW_CANVAS.statusBarPx),
  height: toRem(PREVIEW_CANVAS.contentHeightPx),
}))

const chassisStyle = computed(() => ({
  left: toRem(PREVIEW_CHASSIS.leftPx),
  top: toRem(PREVIEW_CHASSIS.topPx),
  width: toRem(PREVIEW_CHASSIS.widthPx),
  height: toRem(PREVIEW_CHASSIS.heightPx),
}))
</script>

<template>
  <!-- No `overflow-hidden` here: the chassis's side buttons and shadow are meant
       to stick out past the screen, as they do in the mockups. -->
  <div class="phone-preview-canvas relative shrink-0" :style="canvasStyle">
    <!-- `max-w-none` because Tailwind Preflight caps every img at 100% of its
         container, which would squeeze the wider-than-canvas chassis. -->
    <img
      :src="PREVIEW_CHASSIS.src"
      alt=""
      aria-hidden="true"
      class="phone-preview-canvas__chassis absolute max-w-none pointer-events-none"
      :style="chassisStyle"
    />

    <div
      class="phone-preview-canvas__content absolute inset-x-0 flex flex-col overflow-hidden"
      :style="contentStyle"
    >
      <div v-if="$slots.top" class="phone-preview-canvas__top shrink-0">
        <slot name="top" />
      </div>

      <div class="phone-preview-canvas__body flex-1 min-h-0 overflow-y-auto">
        <slot name="body" />
      </div>

      <div v-if="$slots.bottom" class="phone-preview-canvas__bottom shrink-0">
        <slot name="bottom" />
      </div>

      <!-- Transparent even when the overlay is empty, so it must not swallow
           the wheel events that scroll the body. Interactive overlay content
           opts back in with `pointer-events-auto`. -->
      <div
        v-if="$slots.overlay"
        class="phone-preview-canvas__overlay absolute inset-0 overflow-hidden pointer-events-none"
      >
        <slot name="overlay" :unit-rem="unitRem" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The mockup shows a phone screen, and phone screens have no visible scrollbar. */
.phone-preview-canvas__body {
  scrollbar-width: none;
}

.phone-preview-canvas__body::-webkit-scrollbar {
  display: none;
}
</style>
