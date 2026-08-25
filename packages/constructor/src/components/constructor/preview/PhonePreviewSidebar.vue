<script setup lang="ts">
/**
 * The sidebar overlay: one tall slice shown as a pinned top strip, a scrolling
 * middle and a pinned bottom strip — the designer's note "Сайдбар має
 * скролитись, верхня і нижня панелі мають бути фіксовані".
 *
 * No slicing into three files and no hand-built menu markup. All three strips
 * render the same image at full canvas width, so the browser derives its height
 * from the file, and each strip windows into a different part of it:
 *
 *   top     box of `topHeightRem`, image at its natural offset → the first
 *           `topPx` of the slice, everything below clipped
 *   middle  scrollable box holding a window that clips the image top and bottom
 *           via negative margins (see `resolveSidebarBandGeometry`)
 *   bottom  box of `bottomHeightRem` with the image pinned to its lower edge →
 *           the last `bottomPx` of the slice
 *
 * The overlay slot itself is `pointer-events-none` so an empty overlay (step 8
 * first phone, step 7 with the sidebar hidden) does not swallow the wheel that
 * scrolls the phone body. This root opts back in: while the sidebar is open it
 * covers the screen, and the wheel should move its list, not the banners
 * underneath.
 *
 * Opting back in is not enough on its own, though. The two pinned strips are not
 * scroll containers, so a wheel over "Menu ×" or "Casino Time" — and a wheel
 * past either end of the list — chains to the nearest scrollable ancestor, which
 * is the phone body holding the banners. Hence `overscroll-contain` in two
 * places: on the scroll area, which stops the chain at the ends of the list, and
 * on the root, which `overflow-hidden` turns into a scroll container so it can
 * absorb the wheel over the strips.
 */

import { computed } from 'vue'
import { resolveSidebarBandGeometry } from '@/constants/visualPreviewLayout'
import type { PreviewSlice } from '@/composables/useBrandPreviewLayers'

interface Props {
  slice: PreviewSlice
  /** Size of one canvas design px, in rem — see `resolveCanvasUnitRem`. */
  unitRem: number
}

const props = defineProps<Props>()

const geometry = computed(() => resolveSidebarBandGeometry(props.unitRem))

const topBandStyle = computed(() => ({ height: geometry.value.topHeightRem }))
const bottomBandStyle = computed(() => ({ height: geometry.value.bottomHeightRem }))
const middleStyle = computed(() => ({
  marginTop: geometry.value.middleMarginTopRem,
  marginBottom: geometry.value.middleMarginBottomRem,
}))
</script>

<template>
  <div
    class="phone-preview-sidebar flex flex-col h-full overflow-hidden overscroll-contain pointer-events-auto"
  >
    <div class="phone-preview-sidebar__band shrink-0 overflow-hidden" :style="topBandStyle">
      <img :src="slice.url" :alt="slice.typeId" class="block w-full h-auto" />
    </div>

    <div class="phone-preview-sidebar__scroll flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <!-- `overflow-hidden` is what makes this a window rather than a viewport:
           it stops the image's negative margins from collapsing out of the
           window's auto height, so the scrollable height is exactly the part
           neither pinned strip shows. -->
      <div class="phone-preview-sidebar__window overflow-hidden">
        <img
          :src="slice.url"
          alt=""
          aria-hidden="true"
          class="block w-full h-auto"
          :style="middleStyle"
        />
      </div>
    </div>

    <div
      class="phone-preview-sidebar__band relative shrink-0 overflow-hidden"
      :style="bottomBandStyle"
    >
      <img
        :src="slice.url"
        alt=""
        aria-hidden="true"
        class="absolute bottom-0 left-0 block w-full h-auto"
      />
    </div>
  </div>
</template>

<style scoped>
/* A phone screen has no visible scrollbar, and neither does the mockup. */
.phone-preview-sidebar__scroll {
  scrollbar-width: none;
}

.phone-preview-sidebar__scroll::-webkit-scrollbar {
  display: none;
}
</style>
