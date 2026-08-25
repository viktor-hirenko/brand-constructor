<script setup lang="ts">
/**
 * One library slice inside `PhonePreviewCanvas`. Slices are authored at the full
 * canvas width, so the height comes from the file and no geometry is passed in.
 */

import type { PreviewSlice } from '@/composables/useBrandPreviewLayers'

interface Props {
  slice: PreviewSlice
}

defineProps<Props>()
</script>

<template>
  <img :src="slice.url" :alt="slice.typeId" class="phone-preview-slice block w-full h-auto" />
</template>
