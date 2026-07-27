<script setup lang="ts">
import { computed } from 'vue'
import {
  IPHONE_FRAME,
  IPHONE_FRAME_SRC,
  IPHONE_VIEWPORT,
} from '@/constants/iphoneVisualPreview'

const frameStyle = computed(() => ({
  width: `${IPHONE_FRAME.widthRem}rem`,
  height: `${IPHONE_FRAME.heightRem}rem`,
}))

const viewportStyle = computed(() => ({
  width: `${IPHONE_VIEWPORT.widthRem}rem`,
  height: `${IPHONE_VIEWPORT.heightRem}rem`,
  left: `${IPHONE_VIEWPORT.leftRem}rem`,
  top: `${IPHONE_VIEWPORT.topRem}rem`,
  borderRadius: `${IPHONE_VIEWPORT.borderRadiusRem}rem`,
}))
</script>

<template>
  <div class="visual-components-iphone-frame relative shrink-0" :style="frameStyle">
    <img
      :src="IPHONE_FRAME_SRC"
      alt="iPhone frame"
      class="visual-components-iphone-frame__device absolute inset-0 size-full object-cover"
      style="z-index: 0"
    />
    <div
      class="visual-components-iphone-frame__viewport absolute overflow-hidden"
      :style="viewportStyle"
      style="z-index: 10"
    >
      <slot />
    </div>
  </div>
</template>
