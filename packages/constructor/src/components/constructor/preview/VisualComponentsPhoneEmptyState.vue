<script setup lang="ts">
import { computed } from 'vue'
import {
  DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
  PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
} from '@/constants/visualComponentPreviewMessages'

export type VisualComponentsPhoneEmptyVariant = 'delegated' | 'pick-components'

/**
 * The UXUI-2554 treatment: a grey caption straight on the phone's black screen,
 * no icon and no white backdrop. The older light look died with phase 5, when
 * step 8 moved onto `PhonePreviewCanvas` and stopped being the only caller of it.
 */
interface Props {
  variant: VisualComponentsPhoneEmptyVariant
}

const props = defineProps<Props>()

const message = computed(() =>
  props.variant === 'delegated'
    ? DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE
    : PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
)
</script>

<template>
  <div
    class="visual-components-phone-empty h-full flex items-center justify-center p-6 text-center"
  >
    <p class="visual-components-phone-empty__message text-sm text-white/45">
      {{ message }}
    </p>
  </div>
</template>
