<script setup lang="ts">
import { computed } from 'vue'
import {
  IPHONE_FRAME,
  IPHONE_FRAME_SRC,
  IPHONE_VIEWPORT,
} from '@/constants/iphoneVisualPreview'

const frameStyle = computed(() => ({
  width: `${IPHONE_FRAME.widthPx}px`,
  height: `${IPHONE_FRAME.heightPx}px`,
}))

const viewportStyle = computed(() => ({
  width: `${IPHONE_VIEWPORT.widthPx}px`,
  height: `${IPHONE_VIEWPORT.heightPx}px`,
  left: `${IPHONE_VIEWPORT.leftPx}px`,
  top: `${IPHONE_VIEWPORT.topPx}px`,
  borderRadius: `${IPHONE_VIEWPORT.borderRadiusPx}px`,
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
