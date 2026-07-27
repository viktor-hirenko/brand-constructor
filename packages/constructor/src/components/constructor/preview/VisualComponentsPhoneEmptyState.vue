<script setup lang="ts">
import { computed } from 'vue'
import SmartphoneIcon from '@/components/icons/SmartphoneIcon.vue'
import { IPHONE_VIEWPORT } from '@/constants/iphoneVisualPreview'
import {
  DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
  PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
} from '@/constants/visualComponentPreviewMessages'

export type VisualComponentsPhoneEmptyVariant = 'delegated' | 'pick-components'

const props = defineProps<{
  variant: VisualComponentsPhoneEmptyVariant
}>()

const message = computed(() =>
  props.variant === 'delegated'
    ? DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE
    : PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
)

const screenRadiusStyle = computed(() => ({
  borderRadius: `${IPHONE_VIEWPORT.borderRadiusRem}rem`,
}))
</script>

<template>
  <div
    class="visual-components-phone-empty h-full flex items-center justify-center p-6 text-center bg-white/90 backdrop-blur-sm"
    :style="screenRadiusStyle"
  >
    <div>
      <SmartphoneIcon
        class="visual-components-phone-empty__icon size-12 text-muted-foreground mx-auto mb-3"
      />
      <p class="visual-components-phone-empty__message text-sm text-muted-foreground">
        {{ message }}
      </p>
    </div>
  </div>
</template>
