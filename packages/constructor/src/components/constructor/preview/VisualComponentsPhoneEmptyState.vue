<script setup lang="ts">
import { computed } from 'vue'
import SmartphoneIcon from '@/components/icons/SmartphoneIcon.vue'
import { IPHONE_VIEWPORT } from '@/constants/iphoneVisualPreview'
import {
  DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
  PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
} from '@/constants/visualComponentPreviewMessages'

export type VisualComponentsPhoneEmptyVariant = 'delegated' | 'pick-components'

/**
 * `on-dark` is the UXUI-2554 treatment: grey caption straight on the phone's
 * black screen, no icon and no backdrop. `on-light` is the older look, still
 * used by the step 8 panel until it moves onto `PhonePreviewCanvas` (phase 5).
 */
export type VisualComponentsPhoneEmptyTone = 'on-dark' | 'on-light'

interface Props {
  variant: VisualComponentsPhoneEmptyVariant
  tone?: VisualComponentsPhoneEmptyTone
}

const props = withDefaults(defineProps<Props>(), {
  tone: 'on-light',
})

const message = computed(() =>
  props.variant === 'delegated'
    ? DELEGATED_VISUAL_COMPONENTS_PREVIEW_MESSAGE
    : PICK_VISUAL_COMPONENTS_PREVIEW_MESSAGE,
)

const isOnDark = computed(() => props.tone === 'on-dark')

const screenRadiusStyle = computed(() =>
  isOnDark.value ? undefined : { borderRadius: `${IPHONE_VIEWPORT.borderRadiusRem}rem` },
)
</script>

<template>
  <div
    class="visual-components-phone-empty h-full flex items-center justify-center p-6 text-center"
    :class="isOnDark ? '' : 'bg-white/90 backdrop-blur-sm'"
    :style="screenRadiusStyle"
  >
    <div>
      <SmartphoneIcon
        v-if="!isOnDark"
        class="visual-components-phone-empty__icon size-12 text-muted-foreground mx-auto mb-3"
      />
      <p
        class="visual-components-phone-empty__message text-sm"
        :class="isOnDark ? 'text-white/45' : 'text-muted-foreground'"
      >
        {{ message }}
      </p>
    </div>
  </div>
</template>
